export const RUNTIME = 'node-20.0';
export const ENTRYPOINT = 'dist/main.js';
// Git-connected deployments run this inside the function root folder: install
// runtime deps, then produce dist/main.js via the function's own "build"
// script. The full repo is cloned, so src/ may import ../../../scripts and the
// shared esbuild config stays outside the function folder.
export const COMMANDS = 'npm install && npm run build';
export const TIMEOUT = 900;

/**
 * Single Appwrite function on one native cron. A time-based dispatcher inside
 * (see functions/cron/src/main.ts) fans out to the three job cadences:
 * rss every tick, free-games at the top of every hour, weekly-summary on
 * Fridays 12:00 UTC. Staying at one function keeps usage inside Appwrite's
 * free tier (one function = one schedule).
 */
export const FUNCTIONS = [
  {
    id: 'cron',
    dir: 'cron',
    name: 'Game Jobs Cron',
    schedule: '*/5 * * * *',
  },
];

// Mirrors scripts/lib/config.ts — every job reads the same variables.
export const REQUIRED_VARS = [
  'APPWRITE_ENDPOINT',
  'APPWRITE_PROJECT',
  'APPWRITE_API_KEY',
  'APPWRITE_DATABASE_ID',
  'GEMINI_API_KEY',
  'FCM_SERVICE_ACCOUNT',
  'RSS_COLLECTION_ID',
  'ARTICLES_COLLECTION_ID',
  'FREE_GAMES_COLLECTION_ID',
  'SUMMARIES_COLLECTION_ID',
];

// Collection IDs fall back to the same defaults used by config.ts.
export const VAR_DEFAULTS = {
  RSS_COLLECTION_ID: 'news_sources',
  ARTICLES_COLLECTION_ID: 'articles',
  FREE_GAMES_COLLECTION_ID: 'free_games',
  SUMMARIES_COLLECTION_ID: 'weekly_summaries',
};