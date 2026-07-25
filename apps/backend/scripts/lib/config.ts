import { z } from 'zod';
import { loadBackendEnv } from './env';
import { logger } from './logger';

// Ensure the environment is loaded first
loadBackendEnv();

const envSchema = z.object({
  APPWRITE_ENDPOINT: z.string().url(),
  APPWRITE_PROJECT: z.string().min(1),
  APPWRITE_API_KEY: z.string().min(1),
  APPWRITE_DATABASE_ID: z.string().min(1),

  GEMINI_API_KEY: z.string().min(1),

  RSS_COLLECTION_ID: z.string().min(1).default('news_sources'),
  ARTICLES_COLLECTION_ID: z.string().min(1).default('articles'),
  FREE_GAMES_COLLECTION_ID: z.string().min(1).default('free_games'),
  SUMMARIES_COLLECTION_ID: z.string().min(1).default('weekly_summaries'),

  FCM_SERVICE_ACCOUNT: z.string().min(1),
});

// Validate process.env
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  logger.error('❌ Environment validation failed. Missing or invalid variables:');
  logger.error(parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
