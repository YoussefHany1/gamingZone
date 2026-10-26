import { Query } from 'node-appwrite';

import { loadBackendEnv } from './lib/env';
import { env } from './lib/config';
import { createAppwriteDatabases } from './lib/appwrite';
import { getErrorMessage } from './lib/errors';
import { logger } from './lib/logger';
import { cleanDescription } from './features/rss/clean';

// Idempotently re-cleans stored article descriptions in place. Existing titles
// and document IDs are never touched (including TechPowerUp legacyDocId), so
// dedupe/history remains consistent. Paragraph breaks already lost by prior
// Readability textContent extraction cannot be restored by this script.
//
// Usage:
//   npm run backfill:rss-descriptions                        # apps/backend/.env
//   npm run backfill:rss-descriptions -- --app-env .env.staging
//   npm run backfill:rss-descriptions -- --dry-run
//   npm run backfill:rss-descriptions -- --limit 200

loadBackendEnv();

const databases = createAppwriteDatabases();
const DATABASE_ID = env.APPWRITE_DATABASE_ID;
const COLLECTION_ID = env.ARTICLES_COLLECTION_ID;

const PAGE_SIZE = 100;

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

async function run(): Promise<void> {
  const dryRun = hasFlag('--dry-run');
  const limit = getNumericArg('--limit');

  logger.info(`Starting RSS description backfill ${dryRun ? '(dry-run)' : ''}`.trim());

  let scanned = 0;
  let changed = 0;
  let written = 0;
  let failed = 0;
  let cursorAfter: string | undefined;

  while (true) {
    const queries = [Query.orderAsc('$id'), Query.limit(PAGE_SIZE)];
    if (cursorAfter) queries.push(Query.cursorAfter(cursorAfter));

    const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, queries);
    if (!response.documents.length) break;

    for (const doc of response.documents) {
      scanned++;

      if (limit !== null && scanned > limit) break;

      const rawDescription =
        typeof (doc as { description?: unknown }).description === 'string'
          ? ((doc as { description?: string }).description as string)
          : '';

      if (!rawDescription.trim()) continue;

      const title =
        typeof (doc as { title?: unknown }).title === 'string'
          ? (doc as { title?: string }).title
          : undefined;
      const cleaned = cleanDescription(rawDescription, { title });

      if (cleaned === rawDescription.trim()) continue;

      changed++;

      if (dryRun) {
        logger.info(`   Would clean ${doc.$id}: "${title?.substring(0, 40) || ''}"`);
        continue;
      }

      try {
        await databases.updateDocument(DATABASE_ID, COLLECTION_ID, doc.$id, {
          description: cleaned,
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

  logger.info(
    `Done. scanned=${scanned} changed=${changed} written=${written} failed=${failed}${dryRun ? ' (dry-run)' : ''}`,
  );
}

run().catch((error) => {
  logger.error(error, 'Fatal Error');
  process.exit(1);
});
