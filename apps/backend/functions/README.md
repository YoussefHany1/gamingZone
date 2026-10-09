# Appwrite Functions

A **single** Appwrite function (`cron`) runs all three jobs inside Appwrite on one native schedule — keeping usage inside Appwrite's free tier (Appwrite allows one cron per function, so everything shares one `0 * * * *` hourly tick; hourly also keeps the full 69-source RSS sync inside the free 100 GB-hours/month compute allowance).

## How the dispatcher schedules jobs

Appwrite functions support exactly **one** cron schedule, so the function runs every hour and a time-based dispatcher (`src/main.ts`) fans out based on the UTC server clock:

| job             | service                                   | when it runs                      |
| --------------- | ----------------------------------------- | --------------------------------- |
| `rss`           | `rss/rss.service.ts` (`runFetchRss`)      | every `0 * * * *` tick             |
| `free-games`    | `freeGames/freeGames.service.ts`          | top of every hour (UTC minute 0)  |
| `weekly-summary`| `summary/summary.service.ts`              | Fridays 12:00 UTC (minute 0 tick) |

Notes:
- `weekly-summary` is **not** idempotent (it creates a new document each run), so it only fires on the single 12:00 Friday tick.
- Jobs broadcast FCM topic pushes via `firebase-admin` (`FCM_SERVICE_ACCOUNT`): `rss` → `news_<category>_<source>`, `free-games` → `free_games_alerts`, `weekly-summary` → `weekly_summary_alerts`. Pushes are best-effort (a failure is logged, never thrown).
- All GitHub Actions workflows were removed (`trigger-rss.yml`, `free-games.yml`, `weekly-summary.yml`, `deploy-functions.yml`) — scheduling and code deployment are entirely inside Appwrite now.
- Manual triggers (below) can still run one specific job by passing a JSON body.

## Layout

```
apps/backend/
  functions/
    _shared/runner.ts                  # Appwrite handler context types
    cron/            package.json · src/main.ts · dist/main.js (committed)
  scripts/functions/
    config.mjs         # single function entry: id, dir, name, schedule; required variables
    esbuild.config.mjs # shared bundle options (externals, target, banner)
    build.mjs          # esbuild-bundles the function into its dist/main.js (local build)
    build-function.mjs # same build, as the function's own package.json "build" script
    deploy.mjs         # create/update function config + sync variables (one-time setup)
appwrite.json                        # Appwrite CLI spec (uses $APPWRITE_PROJECT_ID / $APPWRITE_ENDPOINT)
```

## How deployment works

`dist/main.js` is built **locally** and committed to the repo. Appwrite's Git-connected build cannot compile it in the container because it only copies the function **root directory** (`apps/backend/functions/cron`) — `scripts/` and `_shared/` are not present — and npm blocks esbuild's install script there. So:

- The build command is plain `npm install` (installs the runtime deps from the function's `package.json`).
- The committed bundle already contains `scripts/features/*`, `scripts/lib/*`, `_shared/runner.ts`, and the pure-JS deps, externalizing the runtime-only or bundle-unfriendly packages that npm installs in the executor: `firebase-admin`, `node-appwrite`, `pino` family, `puppeteer`, `puppeteer-core`, `got-scraping`, `tough-cookie`, `jsdom`, `@mozilla/readability`.
- The deployment packages the root directory (`dist/` + installed `node_modules/`) — exactly what the executor needs.

Regenerate the bundle locally (this mirrors exactly what gets committed):

```sh
cd apps/backend
npm run functions:build   # writes apps/backend/functions/cron/dist/main.js
```

## Deployment via Git integration (connected to the repo)

Code is deployed by Appwrite's GitHub integration — no CI workflow:

1. Console → Functions → `cron` → Settings → Git: connect your GitHub account/repo, set **Branch** to `main`, **Root directory** to `apps/backend/functions/cron`, **Entrypoint** to `dist/main.js`, and **Build command** to `npm install`. Enable auto-deploy.
2. On **Create/Deploy from Git**, Appwrite runs `npm install` and activates the committed `dist/main.js`.
3. Thereafter, every push to `main` that changes files under that root directory rebuilds and redeploys the function automatically.

`npm run functions:deploy` (below) only creates/updates the function config and syncs variables — it does **not** upload code. If you ever need to push a bundle from your machine instead (e.g. before Git is connected), run `APPWRITE_PUSH_CODE=1 npm run functions:deploy`.

## One-time setup

1. `cd apps/backend` and make sure `.env` has the values below (or provide them as environment variables).
2. `npm install --legacy-peer-deps` (installs `esbuild`; approve its install script if npm blocks postinstall scripts).
3. Run `npm run functions:deploy` to create the function and sync its 10 variables.
4. Connect the function to Git as described above, and create the initial deployment from Git.
5. Confirm in your Appwrite console: Functions → `cron` → Settings shows the `0 * * * *` schedule and a **Timeout of 900**; Deployments/Executions shows runs. If you already deployed the old `rss-fetch`, `free-games-fetch`, `weekly-summary`, or `cron-job` functions, delete them in the console (they are replaced by this single `cron` function).

Required function variables mirror `scripts/lib/config.ts`:

```
APPWRITE_ENDPOINT       https://<region>.cloud.appwrite.io/v1
APPWRITE_PROJECT        <project id>
APPWRITE_API_KEY        <server api key with functions + database scopes>
APPWRITE_DATABASE_ID    <database id>
GEMINI_API_KEY          <gemini key>
FCM_SERVICE_ACCOUNT     <minified firebase service account json>
RSS_COLLECTION_ID       news_sources           (default)
ARTICLES_COLLECTION_ID  articles               (default)
FREE_GAMES_COLLECTION_ID free_games            (default)
SUMMARIES_COLLECTION_ID weekly_summaries       (default)
```

Collection IDs fall back to the defaults above if omitted — only the first six are strictly required.

## Manual trigger

The function runs all due jobs on its schedule; to run one specific job on demand:

```sh
curl -X POST "https://<region>.cloud.appwrite.io/v1/functions/cron/executions" \
  -H "X-Appwrite-Project: <project>" \
  -H "X-Appwrite-Key: <api key>" \
  -H "Content-Type: application/json" \
  -d '{"async":true,"method":"POST","path":"/","body":"{\"job\":\"free-games\"}"}'
```

Valid job names: `rss`, `free-games`, `weekly-summary`. Drop `"async":true` to wait for the result synchronously (only for short runs / debugging).

## Known constraint: Puppeteer (and bundling)

- `scripts/features/rss/fetch.ts` lazily imports `puppeteer` as a fallback for JS-rendered pages and missing OG images. Puppeteer is **not** bundled and no Chromium exists inside the Appwrite runtime, so that fallback fails gracefully (logged, caught) and RSS runs on its `got-scraping` path only. `free-games` and `weekly-summary` have no browser dependency and are unaffected.
- `got-scraping` and `tough-cookie` must stay **external** (installed in `node_modules`): esbuild mangling got-scraping's ESM/CJS interop makes it a non-function, and its `header-generator` reads `data_files/headers-order.json` from its own package folder, which a single-file bundle doesn't ship. With them externalized, the real packages (including their data files) are used at runtime.
- `jsdom` and `@mozilla/readability` (OG-image/description enrichment) must also stay **external**: jsdom resolves `lib/jsdom/browser/default-stylesheet.css` by path at document creation, which fails inside a single-file bundle (`ENOENT`, `JSDOM is not a constructor`). The function's `package.json` lists them so `npm install` provides the real packages.

## Updating a job

The bundle pulls in `scripts/features` as source, so after editing a service run:

```sh
cd apps/backend
npm run functions:build
git add apps/backend/functions/cron/dist/main.js
```

Then push to `main` — Appwrite's Git integration redeploys it. To sanity-check the dispatcher locally, the bundle's default export can be invoked with a fake `{req, res, log, error}` context.