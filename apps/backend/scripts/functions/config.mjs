export const RUNTIME = 'node-20.0';
export const ENTRYPOINT = 'dist/main.js';
// Git-connected deployments run this inside the function root folder: install
// runtime deps, then produce dist/main.js via the function's own "build"
// script. The full repo is cloned, so src/ may import ../../../scripts and the
// shared esbuild config stays outside the function folder.
export const COMMANDS = 'npm install && npm run build';
export const TIMEOUT = 900;

/**
 * Functions deployed to Appwrite. `schedule` uses Appwrite-native CRON —
 * rss-fetch and free-games-fetch run entirely inside Appwrite; weekly-summary
 * has no schedule and is triggered by .github/workflows/weekly-summary.yml.
 */
export const FUNCTIONS = [
  {
    id: 'rss-fetch',
    dir: 'rss-fetch',
    name: 'RSS Feed Fetcher',
    schedule: '*/5 * * * *',
  },
  {
    id: 'free-games-fetch',
    dir: 'free-games-fetch',
    name: 'Free Games Fetcher',
    schedule: '0 * * * *',
  },
  {
    id: 'weekly-summary',
    dir: 'weekly-summary',
    name: 'Weekly Summary Generator',
    schedule: '',
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