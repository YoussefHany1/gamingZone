import { z } from 'zod';
import { loadBackendEnv } from './env';
import { logger } from './logger';
import { DEFAULT_CEREBRAS_MODELS, DEFAULT_GROQ_MODELS } from './ai.shared';
import type { AiProvider, AiProviderConfig } from './ai.shared';

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

/**
 * CEREBRAS_API_KEY — optional final-fallback provider key. `null` disables the
 * Cerebras segment of the chain.
 */
export function getCerebrasKey(): string | null {
  const value = process.env.CEREBRAS_API_KEY?.trim();
  return value ? value : null;
}

/**
 * Cerebras model ids in fallback order, from `CEREBRAS_MODELS` (comma-separated;
 * Cerebras ids have no slashes). Generative models only.
 */
export function getCerebrasModels(): string[] {
  const value = process.env.CEREBRAS_MODELS?.trim();
  if (!value) return DEFAULT_CEREBRAS_MODELS;
  const models = value
    .split(',')
    .map((model) => model.trim())
    .filter(Boolean);
  return models.length > 0 ? models : DEFAULT_CEREBRAS_MODELS;
}

/** Groq model id (first of `getGroqModels`, which always returns at least one). */
export function getGroqModel(): string {
  return getGroqModels()[0];
}

/**
 * Groq model ids in fallback order, from `GROQ_MODELS` or `GROQ_MODEL` — both
 * accept a comma-separated list (only the first slash splits; Groq ids contain
 * slashes). Falls back to the generative defaults when neither is set.
 */
export function getGroqModels(): string[] {
  const raw = process.env.GROQ_MODELS?.trim() || process.env.GROQ_MODEL?.trim() || '';
  const models = raw
    .split(',')
    .map((model) => model.trim())
    .filter(Boolean);
  return models.length > 0 ? models : DEFAULT_GROQ_MODELS;
}

/** `AI_PROVIDER=gemini|groq` forces a single provider (smoke tests / ops). */
export function getAiProviderOverride(): AiProvider | null {
  const value = process.env.AI_PROVIDER?.trim().toLowerCase();
  return value === 'gemini' || value === 'groq' ? value : null;
}

/**
 * Raw `AI_CHAIN` env value — a comma-separated model list that replaces the
 * built-in fallback chain. A bare id is a Gemini model; `<provider>/<model>`
 * picks another provider, where only the FIRST slash splits because Groq model
 * ids themselves contain slashes (`groq/openai/gpt-oss-120b`). Parsed (and
 * validated loudly) per call in `resolveAiModels`.
 */
export function getAiChainEnv(): string | null {
  const value = process.env.AI_CHAIN?.trim();
  return value ? value : null;
}

/**
 * Everything the AI model chain needs, in one bag. Resolved lazily (instead of
 * at module load) so a missing optional key fails just the job that needs it —
 * the cron runner catches failures per job, so rss/free-games still run.
 */
export function getAiProviderConfig(): AiProviderConfig {
  return {
    geminiKey: getGeminiKey(),
    groqKey: getGroqKey(),
    cerebrasKey: getCerebrasKey(),
    groqModels: getGroqModels(),
    cerebrasModels: getCerebrasModels(),
    chainEnv: getAiChainEnv(),
    override: getAiProviderOverride(),
  };
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
