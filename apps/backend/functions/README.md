# Appwrite Functions

Three single-purpose Appwrite functions replace the runners that used to execute the scraping jobs. **RSS and free-games run entirely inside Appwrite** on native schedules; only the weekly summary is still scheduled from GitHub Actions.

## Functions

| function            | job / service                             | schedule                                                   |
| ------------------- | ----------------------------------------- | ---------------------------------------------------------- |
| `rss-fetch`         | `rss/rss.service.ts` (`runFetchRss`)      | Appwrite-native CRON `*/5 * * * *` (every 5 min, UTC)      |
| `free-games-fetch`  | `freeGames/freeGames.service.ts`          | Appwrite-native CRON `0 * * * *` (every hour, UTC)         |
| `weekly-summary`    | `summary/summary.service.ts`              | none — triggered by `.github/workflows/weekly-summary.yml` |

GitHub Actions only remains for `weekly-summary.yml` (Fridays 12:00 UTC). `trigger-rss.yml`, `free-games.yml`, and `deploy-functions.yml` were removed — code deploys now come from Appwrite's Git integration.

## Layout

```
apps/backend/
  functions/
    _shared/runner.ts                  # tiny Appwrite handler wrapper (types + job runner)
    rss-fetch/         package.json · src/main.ts · dist/main.js (generated at build)
    free-games-fetch/  package.json · src/main.ts · dist/main.js (generated at build)
    weekly-summary/    package.json · src/main.ts · dist/main.js (generated at build)
  scripts/functions/
    config.mjs         # function list: ids, dirs, names, schedules; required variables
    esbuild.config.mjs # shared bundle options (externals, target, banner)
    build.mjs          # esbuild-bundles every function into its dist/main.js (local repro)
    build-function.mjs # build script each function's package.json runs (Appwrite Git build)
    deploy.mjs         # create/update function config + sync variables (one-time setup)
appwrite.json                        # optional Appwrite CLI spec (uses $APPWRITE_PROJECT_ID / $APPWRITE_ENDPOINT)
.github/workflows/
  weekly-summary.yml   # POST /functions/weekly-summary/executions (async)
```

## How deployment works

Appwrite only copies the function **root directory** (`apps/backend/functions/<id>`) into the deployment package, while the job code lives outside it under `scripts/`. To work around that, every function carries a **self-contained `build` script** that Appwrite runs inside the function folder via the function's `commands` (`npm install && npm run build`):

1. Appwrite clones the **whole repo**, so each `src/main.ts` can still import `../../../scripts/features/*`, `../../../scripts/lib/*`, and `../../_shared/runner.ts`.
2. Each function's `build` script (`node ../../scripts/functions/build-function.mjs`) runs with cwd = the function root, resolves `esbuild` from that root's `node_modules` (npm just installed it), and bundles the shared source into that function's `dist/main.js`, externalizing the runtime-only packages (`firebase-admin`, `node-appwrite`, `pino` family, `puppeteer`) that Appwrite `npm install`s from the function's own `package.json`.
3. The deployment packages only the root directory (`dist/` + installed `node_modules/`) — exactly what the executor needs.

Because the functions' `package.json` build scripts mirror `scripts/functions/build.mjs`, `npm run functions:build` is a faithful local reproduction of what Appwrite's Git build does.

## Deployment via Git integration (connected to the repo)

`deploy-functions.yml` was removed. Code is now deployed by Appwrite's GitHub integration:

1. For each function (Console → Functions → `<id>` → Settings → Git): connect your GitHub account/repo, set **Branch** to `main` and **Root directory** to `apps/backend/functions/<id>`. Enable auto-deploy.
2. On **Create/Deploy from Git**, Appwrite runs `npm install && npm run build` (command + entrypoint come from the function config) and activates `dist/main.js`.
3. Thereafter, every push to `main` that changes a function's files under its root directory rebuilds and redeploys that function automatically. Nothing to do manually.

One-time setup: after the functions exist, `npm run functions:deploy` (below) only creates/updates the function config and syncs variables — it does **not** upload code. If you ever need to push a bundle from your machine instead (e.g. before Git is connected), run `APPWRITE_PUSH_CODE=1 npm run functions:deploy`.

## One-time setup

1. `cd apps/backend` and make sure `.env` has the values below (or provide them as environment variables).
2. `npm install --legacy-peer-deps` (installs `esbuild`; approve its install script if npm blocks postinstall scripts).
3. Run `npm run functions:deploy` to create the functions and set their 10 variables.
4. Connect each function to Git as described above, and create the initial deployment from Git.
5. Confirm in your Appwrite console: Functions → each function → Settings shows its schedule; Deployments/Executions shows runs. If you already deployed the old `cron-job` function, delete it in the console (it is replaced by `weekly-summary`).

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

`rss-fetch` / `free-games-fetch` already run on their Appwrite schedules; you can still fire them on demand:

```sh
curl -X POST "https://<region>.cloud.appwrite.io/v1/functions/rss-fetch/executions" \
  -H "X-Appwrite-Project: <project>" \
  -H "X-Appwrite-Key: <api key>" \
  -H "Content-Type: application/json" \
  -d '{"async":true,"method":"POST","path":"/"}'
```

The same works for `/functions/free-games-fetch/executions` and `/functions/weekly-summary/executions`. Drop `"async":true` to wait for the result synchronously (only for short runs / debugging).

## Known constraint: Puppeteer

`scripts/features/rss/fetch.ts` lazily imports `puppeteer` as a fallback for JS-rendered pages and missing OG images. Puppeteer is **not** bundled and no Chromium exists inside the Appwrite runtime, so that fallback fails gracefully (logged, caught) and RSS runs on its static `got-scraping` path only. `free-games` and `weekly-summary` have no browser dependency and are unaffected.

## Updating a job

Because each bundle pulls in `scripts/features` as source, editing a service and pushing to `main` is all that's needed — Appwrite's Git integration rebuilds and redeploys any function whose root directory changed. To reproduce the exact build locally first, run `npm run functions:build`.