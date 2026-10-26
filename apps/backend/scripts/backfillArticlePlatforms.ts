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
// Writes are batched: documents are grouped by their resulting platform set and
// each group is pushed with `updateDocuments` + `Query.equal('$id', [...])`.
// Per-document updates take minutes on Appwrite Cloud, so batching is what makes
// a full collection run feasible.
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
/** Documents per bulk update; `$id` queries stay well under Appwrite's limits. */
const UPDATE_CHUNK_SIZE = 25;
/** Parallel bulk updates; higher values start hitting Appwrite Cloud timeouts. */
const UPDATE_CONCURRENCY = 4;
/** How many would-be tags a dry run prints before staying quiet. */
const DRY_RUN_LOG_LIMIT = 20;

type ArticleDoc = {
  $id: string;
  title?: unknown;
  description?: unknown;
  platforms?: unknown;
};

type PendingChunk = {
  ids: string[];
  platforms: ArticlePlatform[];
  source: 'backfill' | 'default';
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

/** Key that groups documents sharing the exact same platform set. */
function groupKey(source: string, platforms: ArticlePlatform[]): string {
  return `${source}:${platforms.join(',')}`;
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
  let dryRunLogged = 0;
  let cursorAfter: string | undefined;

  const histogram: Record<ArticlePlatform, number> = Object.fromEntries(
    ARTICLE_PLATFORMS.map((platform) => [platform, 0]),
  ) as Record<ArticlePlatform, number>;
  let general = 0;

  // Documents waiting to be written, keyed by their target platform set.
  const pending = new Map<string, PendingChunk>();
  const inFlight = new Set<Promise<void>>();

  const flush = async (chunk: PendingChunk): Promise<void> => {
    const task = (async () => {
      try {
        await databases.updateDocuments(
          DATABASE_ID,
          COLLECTION_ID,
          {
            platforms: chunk.platforms,
            platforms_source: chunk.source,
          },
          [Query.equal('$id', chunk.ids)],
        );
        written += chunk.ids.length;
      } catch (error: unknown) {
        failed += chunk.ids.length;
        logger.warn(
          `   Failed to update ${chunk.ids.length} document(s) as [${chunk.platforms.join(', ')}]: ${getErrorMessage(error)}`,
        );
      }
    })();

    inFlight.add(task);
    void task.finally(() => inFlight.delete(task));

    if (inFlight.size >= UPDATE_CONCURRENCY) {
      await Promise.race(inFlight);
    }
  };

  const queue = async (chunk: PendingChunk): Promise<void> => {
    if (dryRun) {
      if (dryRunLogged < DRY_RUN_LOG_LIMIT) {
        dryRunLogged += chunk.ids.length;
        logger.info(
          `   Would tag ${chunk.ids.length} document(s) as [${chunk.platforms.join(', ')}] (${chunk.source})`,
        );
      }
      return;
    }

    const key = groupKey(chunk.source, chunk.platforms);
    const existing = pending.get(key);
    if (!existing) {
      pending.set(key, chunk);
      return;
    }

    existing.ids.push(...chunk.ids);
    if (existing.ids.length >= UPDATE_CHUNK_SIZE) {
      const ids = existing.ids.splice(0, UPDATE_CHUNK_SIZE);
      await flush({ ids, platforms: existing.platforms, source: existing.source });
    }
  };

  while (true) {
    const queries = [
      Query.orderAsc('$id'),
      Query.limit(PAGE_SIZE),
      Query.select(['$id', 'title', 'description', 'platforms']),
    ];
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

      await queue({ ids: [doc.$id], platforms, source });
    }

    if (limit !== null && scanned >= limit) break;

    cursorAfter = response.documents[response.documents.length - 1].$id;
  }

  // Drain whatever is left of the pending groups.
  for (const chunk of pending.values()) {
    if (!chunk.ids.length) continue;
    await flush({
      ids: chunk.ids.splice(0, chunk.ids.length),
      platforms: chunk.platforms,
      source: chunk.source,
    });
  }
  await Promise.all(inFlight);

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
