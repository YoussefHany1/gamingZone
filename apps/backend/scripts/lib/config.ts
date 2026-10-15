import { z } from 'zod';
import { loadBackendEnv } from './env';
import { logger } from './logger';
import { DEFAULT_GROQ_MODEL } from './ai.shared';
import type { AiProvider } from './ai.shared';

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
 * AI provider keys for the summary jobs. Resolved lazily (instead of at module
 * load) so a missing key fails just the job that needs it — the cron runner
 * catches failures per job, so rss/free-games still run.
 *
 * Gemini is the primary provider; Groq is the fallback. Either may be absent.
 */
export function getGeminiKey(): string | null {
  const value = process.env.GEMINI_API_KEY?.trim();
  return value ? value : null;
}

/** Optional fallback provider key. `null` disables the Groq fallback. */
export function getGroqKey(): string | null {
  const value = process.env.GROQ_API_KEY?.trim();
  return value ? value : null;
}

/** Groq model id; falls back to a sane generative default. */
export function getGroqModel(): string {
  const value = process.env.GROQ_MODEL?.trim();
  return value ? value : DEFAULT_GROQ_MODEL;
}

/** `AI_PROVIDER=gemini|groq` forces a single provider (smoke tests / ops). */
export function getAiProviderOverride(): AiProvider | null {
  const value = process.env.AI_PROVIDER?.trim().toLowerCase();
  return value === 'gemini' || value === 'groq' ? value : null;
}

/**
 * FCM_SERVICE_ACCOUNT — optional. When absent, Firebase Admin init returns
 * `enabled: false` and FCM push notifications are skipped (the job still runs).
 */
export function requireFcmServiceAccount(): string | null {
  return process.env.FCM_SERVICE_ACCOUNT ?? null;
}
/**
 * TWITCH_CLIENT_ID & TWITCH_CLIENT_SECRET — required for querying IGDB directly.
 */
export function requireTwitchCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      'TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET are required for the game releases job.',
    );
  }
  return { clientId: clientId.trim(), clientSecret: clientSecret.trim() };
}
