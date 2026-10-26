import { Query } from 'node-appwrite';

import { loadBackendEnv } from './lib/env';
import { env } from './lib/config';
import { createAppwriteDatabases } from './lib/appwrite';
import { getErrorMessage } from './lib/errors';
import { logger } from './lib/logger';
import { ALL_PLATFORMS, ARTICLE_PLATFORMS, detectPlatformsFromText } from './lib/articlePlatforms';
import type { ArticlePlatform } from './lib/articlePlatforms';

// Deterministic, AI-free backfill of `articles.platforms` for articles that
// predate platform classification. Uses only the headline/description keyword
// scan, so it costs nothing and can be re-run safely: documents that already
// have at least one platform are skipped (an AI-classified value is never
// overwritten). Articles that match no platform are treated as general and get
// all six ids, which makes them match every mobile filter.
//
// Usage:
//   npm run backfill:article-platforms                        # apps/backend/.env
//   npm run backfill:article-platforms -- --app-env .env.staging
//   npm run backfill:article-platforms -- --dry-run
//   npm run backfill:article-platforms -- --limit 200

loadBackendEnv();

const databases = createAppwriteDatabases();
const DATABASE_ID = env.APPWRITE_DATABASE_ID;
const COLLECTION_ID = env.ARTICLES_COLLECTION_ID;

const PAGE_SIZE = 100;

type ArticleDoc = {
  $id: string;
  title?: unknown;
  description?: unknown;
  platforms?: unknown;
};

function hasFlag(name: string): boolean {
  return process.argv.slice(2).includes(name);
}

function getNumericArg(name: string): number | null {
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === name) {
      const next = argv[i + 1];
      const value = next ? Number(next) : NaN;
      return Number.isFinite(value) ? value : null;
    }
    if (arg.startsWith(`${name}=`)) {
      const value = Number(arg.slice(`${name}=`.length));
      return Number.isFinite(value) ? value : null;
    }
  }
  return null;
}

function asText(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

/** True when the document already carries a usable platforms list. */
function hasPlatforms(value: unknown): boolean {
  return Array.isArray(value) && value.some((item) => typeof item === 'string' && item.trim());
}

async function run(): Promise<void> {
  const dryRun = hasFlag('--dry-run');
  const limit = getNumericArg('--limit');

  logger.info(`Starting article platform backfill ${dryRun ? '(dry-run)' : ''}`.trim());

  let scanned = 0;
  let alreadyTagged = 0;
  let changed = 0;
  let written = 0;
  let failed = 0;
  let cursorAfter: string | undefined;

  const histogram: Record<ArticlePlatform, number> = Object.fromEntries(
    ARTICLE_PLATFORMS.map((platform) => [platform, 0]),
  ) as Record<ArticlePlatform, number>;
  let general = 0;

  while (true) {
    const queries = [Query.orderAsc('$id'), Query.limit(PAGE_SIZE)];
    if (cursorAfter) queries.push(Query.cursorAfter(cursorAfter));

    const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, queries);
    if (!response.documents.length) break;

    for (const raw of response.documents) {
      if (limit !== null && scanned >= limit) break;

      const doc = raw as unknown as ArticleDoc;
      scanned++;

      if (hasPlatforms(doc.platforms)) {
        alreadyTagged++;
        continue;
      }

      const title = asText(doc.title);
      const description = asText(doc.description);
      const detected = detectPlatformsFromText(title, description);
      const platforms = detected.length > 0 ? detected : [...ALL_PLATFORMS];
      const source = detected.length > 0 ? 'backfill' : 'default';

      if (platforms.length === ARTICLE_PLATFORMS.length) {
        general++;
      } else {
        for (const platform of platforms) histogram[platform]++;
      }

      changed++;

      if (dryRun) {
        logger.info(
          `   Would tag ${doc.$id} as [${platforms.join(', ')}]: "${(title ?? '').substring(0, 40)}"`,
        );
        continue;
      }

      try {
        await databases.updateDocument(DATABASE_ID, COLLECTION_ID, doc.$id, {
          platforms,
          platforms_source: source,
        });
        written++;
      } catch (error: unknown) {
        failed++;
        logger.warn(`   Failed to update ${doc.$id}: ${getErrorMessage(error)}`);
      }
    }

    if (limit !== null && scanned >= limit) break;

    cursorAfter = response.documents[response.documents.length - 1].$id;
  }

  const breakdown = ARTICLE_PLATFORMS.map((platform) => `${platform}=${histogram[platform]}`).join(
    ' ',
  );

  logger.info(
    `Done. scanned=${scanned} changed=${changed} written=${written} alreadyTagged=${alreadyTagged} general=${general} failed=${failed}${dryRun ? ' (dry-run)' : ''}`,
  );
  logger.info(`Detected platforms: ${breakdown}`);
}

run().catch((error) => {
  logger.error(error, 'Fatal Error');
  process.exit(1);
});
