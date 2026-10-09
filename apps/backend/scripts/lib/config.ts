import { z } from 'zod';
import { loadBackendEnv } from './env';
import { logger } from './logger';

// Ensure the environment is loaded first
loadBackendEnv();

// Core variables are required by EVERY job/script: they are the Appwrite
// connection and the documents the jobs read/write. Optional, per-job secrets
// (GEMINI_API_KEY, FCM_SERVICE_ACCOUNT) are resolved lazily via the
// accessors below so one missing optional key cannot take down unrelated
// jobs in the same cron process.
const coreEnvSchema = z.object({
  APPWRITE_ENDPOINT: z.string().url(),
  APPWRITE_PROJECT: z.string().min(1),
  APPWRITE_API_KEY: z.string().min(1),
  APPWRITE_DATABASE_ID: z.string().min(1),

  RSS_COLLECTION_ID: z.string().min(1).default('news_sources'),
  ARTICLES_COLLECTION_ID: z.string().min(1).default('articles'),
  FREE_GAMES_COLLECTION_ID: z.string().min(1).default('free_games'),
  SUMMARIES_COLLECTION_ID: z.string().min(1).default('weekly_summaries'),
});

// Validate process.env
const parsed = coreEnvSchema.safeParse(process.env);

if (!parsed.success) {
  logger.error('❌ Core environment validation failed. Missing or invalid variables:');
  logger.error(parsed.error.format());
  throw new Error('Core environment validation failed — see log output above.');
}

export const env = parsed.data;

/**
 * GEMINI_API_KEY — required only by the weekly-summary job. Resolving it lazily
 * (instead of at module load) means a missing key fails just that job, which the
 * cron runner catches per-job, while the rss/free-games jobs still run.
 * Throwing (not process.exit) keeps the failure recoverable and testable.
 */
export function requireGeminiKey(): string {
  const value = process.env.GEMINI_API_KEY;
  if (!value) {
    throw new Error('GEMINI_API_KEY is not set — required for the weekly summary job.');
  }
  return value;
}

/**
 * FCM_SERVICE_ACCOUNT — optional. When absent, Firebase Admin init returns
 * `enabled: false` and FCM push notifications are skipped (the job still runs).
 */
export function requireFcmServiceAccount(): string | null {
  return process.env.FCM_SERVICE_ACCOUNT ?? null;
}