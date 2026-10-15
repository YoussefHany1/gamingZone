import * as sdk from 'node-appwrite';

import { logger } from '../lib/logger';
import { loadBackendEnv } from '../lib/env';
import { env } from '../lib/config';
import { createAppwriteDatabases } from '../lib/appwrite';
import {
  SUMMARY_LANGUAGES,
  LANGUAGE_TO_ATTRIBUTE,
} from '../features/summary/articleSummary.shared';

// Read-only inspector: reports how many articles are pending / summarized /
// given-up and shows a sample document's stored summaries. Useful to verify a
// backfill run (especially against staging) without opening the console.
//
// Usage:
//   npm run summary:articles:status                       # apps/backend/.env
//   npm run summary:articles:status -- --app-env .env.staging

loadBackendEnv();

const DATABASE_ID = env.APPWRITE_DATABASE_ID;
const ARTICLES_COLLECTION_ID = env.ARTICLES_COLLECTION_ID;
const databases = createAppwriteDatabases();

const SAMPLE_SIZE = 3;

interface SummaryRow {
  $id: string;
  title?: string;
  summaries_at?: string;
  summaries_attempts?: number;
  summaries_failed?: boolean;
  [key: string]: unknown;
}

async function count(queries: string[]): Promise<number> {
  const response = await databases.listDocuments(DATABASE_ID, ARTICLES_COLLECTION_ID, [
    ...queries,
    sdk.Query.limit(1),
  ]);
  return response.total;
}

async function main(): Promise<void> {
  logger.info(`📊 Article summary status — ${DATABASE_ID}/${ARTICLES_COLLECTION_ID}`);

  const [pending, summarized, failed, total] = await Promise.all([
    count([sdk.Query.isNull('summaries_at'), sdk.Query.equal('summaries_failed', false)]),
    count([sdk.Query.isNotNull('summaries_at')]),
    count([sdk.Query.equal('summaries_failed', true)]),
    count([]),
  ]);

  logger.info(
    `   total: ${total} · summarized: ${summarized} · pending: ${pending} · failed: ${failed}`,
  );

  if (summarized > 0) {
    const sample = await databases.listDocuments(DATABASE_ID, ARTICLES_COLLECTION_ID, [
      sdk.Query.isNotNull('summaries_at'),
      sdk.Query.orderDesc('summaries_at'),
      sdk.Query.limit(SAMPLE_SIZE),
    ]);

    for (const raw of sample.documents as unknown as SummaryRow[]) {
      const present = SUMMARY_LANGUAGES.filter((language) => {
        const value = raw[LANGUAGE_TO_ATTRIBUTE[language]];
        return typeof value === 'string' && value.trim().length > 0;
      });
      logger.info(
        `   • ${raw.$id} — ${present.length}/${SUMMARY_LANGUAGES.length} languages ` +
          `(attempts: ${raw.summaries_attempts ?? 0}, at: ${raw.summaries_at})\n     ${raw.title ?? ''}`,
      );
    }
  }
}

main()
  .then(() => setTimeout(() => process.exit(0), 250))
  .catch((error) => {
    logger.error(error, 'Fatal Error');
    setTimeout(() => process.exit(1), 250);
  });
