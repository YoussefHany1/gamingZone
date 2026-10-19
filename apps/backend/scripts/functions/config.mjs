export const RUNTIME = 'node-22';
export const ENTRYPOINT = 'dist/main.js';
// Only install runtime deps — the deployment bundle (dist/main.js) is built
// locally and committed, because the Git-connected build container receives
// only the function root folder (../scripts, _shared aren't there) and npm
// blocks esbuild's install script there.
export const COMMANDS = 'npm install';
export const TIMEOUT = 900;

/**
 * Single Appwrite function on one native cron. A time-based dispatcher inside
 * (see functions/cron/src/main.ts) fans out to the three job cadences:
 * rss every tick, free-games at the top of every hour, weekly-summary on
 * Fridays 12:00 UTC. Staying at one function keeps usage inside Appwrite's
 * free tier (one function = one schedule). Hourly cadence keeps the free
 * 100 GB-hours/month compute allowance (a 5-minute full RSS sync would
 * overshoot it by 1.5-3x).
 *
 * The surviving function is the project's original one, id
 * `6ac81314002e085236df` ("gamingZone" — see RETIRED_FUNCTIONS for the merge).
 * Its Appwrite id is generated and can't change, so the mapping is: Appwrite
 * function `6ac81314002e085236df` ⟵ local bundle directory `functions/cron`.
 *
 * Executions are driven by `interval` (minutes): the legacy `schedule` cron
 * string is empty on this server and node-appwrite 21 doesn't expose
 * `interval`, so deploy.mjs PUTs it over REST on every run.
 */
export const FUNCTIONS = [
  {
    id: '6ac81314002e085236df',
    dir: 'cron',
    name: 'gamingZone',
    interval: 60,
    schedule: '',
  },
];

/**
 * Duplicates to switch off on every deploy, as `{ id, name }`.
 *
 * The "Game Jobs Cron" function (`cron`) used to live here: it was the
 * repo-created duplicate of the function above, so both ran this same
 * dispatcher on the same hourly interval against the same database and every
 * tick was processed twice (duplicate RSS fetches, duplicate FCM pushes, twice
 * the memory). The survivor is `6ac81314002e085236df`: the original deployment
 * of this backend, the owner of the app's public function identity, and the one
 * connected to Appwrite's Git integration. `cron` was retired on 2026-10-19 and
 * deleted the same day, once the survivor had completed a verified scheduled
 * tick — so this list is intentionally empty.
 *
 * Keep the list (and the machinery that enforces it) for future cleanups. Note
 * that Appwrite keeps firing a function's schedule even while the function is
 * disabled (`enabled: false`), and on this server executions are driven by the
 * `interval` field (minutes; 60 = hourly), not the legacy `schedule`. Retiring
 * one therefore means writing interval=0 + enabled=false —
 * `npm run functions:deploy` does that (idempotently). Its deployments and
 * captured variables are left untouched, so it can be restored from the console
 * without losing anything. Entries that no longer exist are skipped.
 */
export const RETIRED_FUNCTIONS = [];

// Mirrors scripts/lib/config.ts — every job reads the same variables.
export const REQUIRED_VARS = [
  'APPWRITE_ENDPOINT',
  'APPWRITE_PROJECT',
  'APPWRITE_API_KEY',
  'APPWRITE_DATABASE_ID',
  'GEMINI_API_KEY',
  'GROQ_API_KEY',
  'GROQ_MODEL',
  'FCM_SERVICE_ACCOUNT',
  'RSS_COLLECTION_ID',
  'ARTICLES_COLLECTION_ID',
  'FREE_GAMES_COLLECTION_ID',
  'SUMMARIES_COLLECTION_ID',
  'TWITCH_CLIENT_ID',
  'TWITCH_CLIENT_SECRET',
];

// Collection IDs fall back to the same defaults used by config.ts.
export const VAR_DEFAULTS = {
  RSS_COLLECTION_ID: 'news_sources',
  ARTICLES_COLLECTION_ID: 'articles',
  FREE_GAMES_COLLECTION_ID: 'free_games',
  SUMMARIES_COLLECTION_ID: 'weekly_summaries',
  // Must match DEFAULT_GROQ_MODEL in scripts/lib/ai.shared.ts.
  GROQ_MODEL: 'openai/gpt-oss-120b',
};

// Variables that a deploy should DELETE if they exist on the function.
//
// `NODE_OPTIONS` was synced here in an attempt to bound the job's heap, which
// turned out to be impossible from the environment: Appwrite launches the
// entrypoint with its own `--max_old_space_size=8192` and command-line flags
// beat NODE_OPTIONS (see functions/README.md → "Memory ceiling"). The cap now
// lives in the child process the entrypoint spawns, so the variable is dead
// weight and is removed on the next deploy.
export const OBSOLETE_VARS = ['NODE_OPTIONS'];
