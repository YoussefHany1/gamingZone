# Appwrite Functions

A **single** Appwrite function runs all three jobs inside Appwrite on one native schedule — keeping usage inside Appwrite's free tier (Appwrite allows one cron per function, so everything shares one hourly tick; hourly also keeps the full 69-source RSS sync inside the free 100 GB-hours/month compute allowance).

That function is **`gamingZone`** (Appwrite id `6ac81314002e085236df`) — the project's original function, and the one that holds the Git integration. Only the _local_ bundle directory keeps the name `cron` (`apps/backend/functions/cron`, also the cache dir shared with `scripts/`), so "cron" survives as a folder/log prefix while the Appwrite function is `gamingZone`. The second function (`cron` / "Game Jobs Cron") was merged into it, retired, and then deleted — see [One function only](#one-function-only).

## How the dispatcher schedules jobs

Appwrite functions support exactly **one** schedule, and on this server that field is `interval` (minutes — `60` = hourly). The legacy `schedule` cron string is empty and is not what fires the runs; `npm run functions:deploy` PUTs `interval` (node-appwrite 21 doesn't expose it) on every run. The function runs every hour and a time-based dispatcher (`src/main.ts`) fans out based on the UTC server clock:

| job                 | service                                                             | when it runs                      |
| ------------------- | ------------------------------------------------------------------- | --------------------------------- |
| `rss`               | `rss/rss.service.ts` (`runFetchRss`)                                | every hourly tick                 |
| `article-summaries` | `summary/articleSummary.service.ts` (`runBackfillArticleSummaries`) | every hourly tick                 |
| `free-games`        | `freeGames/freeGames.service.ts`                                    | top of every hour (UTC minute 0)  |
| `weekly-summary`    | `summary/summary.service.ts`                                        | Fridays 12:00 UTC (minute 0 tick) |

Notes:

- `article-summaries` runs immediately after `rss` on every tick, so articles created in the same invocation are summarized within seconds — no AI work is added to the ingestion path. It generates a ≤3-line summary per supported app language (en/ar/es/fr/hi/pt-BR/pt-PT) plus the article's gaming platforms in the same model call, newest-first, plus a bounded oldest-first slice so the backlog converges. Requires the `articles` collection to have the `summary_*` / `summaries_at` / `summaries_attempts` / `summaries_failed` / `platforms` / `platforms_source` attributes (no index — see below). Ingestion tags `platforms` immediately (keyword scan) so a new article is never missing from the mobile filter, and the AI classification overwrites that value when it succeeds.
- `weekly-summary` is **not** idempotent (it creates a new document each run), so it only fires on the single 12:00 Friday tick.
- Jobs broadcast FCM topic pushes via `firebase-admin` (`FCM_SERVICE_ACCOUNT`): `rss` → `news_<category>_<source>`, `free-games` → `free_games_alerts`, `weekly-summary` → `weekly_summary_alerts`. Pushes are best-effort (a failure is logged, never thrown).
- All GitHub Actions workflows were removed (`trigger-rss.yml`, `free-games.yml`, `weekly-summary.yml`, `deploy-functions.yml`) — scheduling and code deployment are entirely inside Appwrite now.
- Manual triggers (below) can still run one specific job by passing a JSON body.

## Layout

```
apps/backend/
  functions/
    _shared/runner.ts                  # Appwrite handler context types
    cron/            package.json · src/main.ts + src/worker.ts · dist/main.js + dist/worker.js (committed)
  scripts/functions/
    config.mjs         # function entry (id, dir, name, interval), required variables, retired duplicates
    esbuild.config.mjs # shared bundle options (externals, target, banner)
    build.mjs          # esbuild-bundles both entry points into dist/ (local build)
    build-function.mjs # same build, as the function's own package.json "build" script
    deploy.mjs         # create/update function config + sync variables (one-time setup)
appwrite.json                        # Appwrite CLI spec (uses $APPWRITE_PROJECT_ID / $APPWRITE_ENDPOINT)
```

`src/main.ts` is the entrypoint and `src/worker.ts` is the heap-capped child it spawns (see
[Memory ceiling](#memory-ceiling)); both are emitted into `dist/`, which is what the
Git-connected deploy activates. Adding a job means adding it to `worker.ts` and to the
`JOB_NAMES` list in `main.ts`.

## Article summaries (schema + backfill)

`article-summaries` needs 12 extra attributes on the `articles` collection (the
seven summaries, three state fields, and `platforms` / `platforms_source`). No
index is needed: Appwrite rejects indexes on array attributes ("Creating indexes
on array attributes is not currently supported"), and the mobile feed's
`Query.contains('platforms', [...])` filter works without one (verified against
production). Attributes are created idempotently (only the missing ones) by:

```sh
cd apps/backend
npm run migrate:article-summaries                       # apps/backend/.env
npm run migrate:article-summaries -- --dry-run          # report only
npm run migrate:article-summaries -- --app-env .env.staging   # target staging
```

The script derives the seven `summary_*` names from the same language map the
code uses, and never alters an existing attribute — a shape mismatch is logged as
a warning for manual review. It creates attributes, waits for them to become
`available`, then runs the exact `Query.contains('platforms', [...])` query the
mobile feed issues, so a broken filter fails here instead of in production.

Articles written before platform classification need a one-off deterministic
backfill (keyword scan of the title/description; no AI calls):

```sh
npm run backfill:article-platforms -- --dry-run --limit 200   # preview
npm run backfill:article-platforms                            # all legacy articles
```

It never overwrites a document that already has a `platforms` value, and
articles that match no platform are tagged with all six ids (general news
matches every filter). Re-running it is safe.

Verify state at any time (read-only):

```sh
npm run summary:articles:status                        # counts + a sample
npm run summary:articles -- --limit 2 --app-env .env.staging   # cheap smoke run
```

`--app-env <file>` (or `ENV_FILE=<file>`) selects an env file other than
`apps/backend/.env`; it wins over anything already in the shell so a staging
run can never silently fall back to production values. **(Note: Node.js reserves
`--env-file`, hence the `--app-env` name.)**

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

1. Console → Functions → **`gamingZone`** → Settings → Git: connect your GitHub account/repo (already connected), with **Branch** `main`, **Root directory** `apps/backend/functions/cron`, **Entrypoint** `dist/main.js`, **Build command** `npm install`. Enable auto-deploy.
2. On **Create/Deploy from Git**, Appwrite runs `npm install` and activates the committed `dist/main.js`.
3. Thereafter, every push to `main` that changes files under that root directory rebuilds and redeploys the function automatically.

`npm run functions:deploy` (below) only creates/updates the function config and syncs variables — it does **not** upload code. If you ever need to push a bundle from your machine instead (e.g. before Git is connected), run `APPWRITE_PUSH_CODE=1 npm run functions:deploy`.

## One-time setup

1. `cd apps/backend` and make sure `.env` has the values below (or provide them as environment variables).
2. `npm install --legacy-peer-deps` (installs `esbuild`; approve its install script if npm blocks postinstall scripts).
3. Run `npm run functions:deploy` to create/update the function and sync its 15 variables.
4. Connect the function to Git as described above, and create the initial deployment from Git.
5. Confirm in your Appwrite console: Functions → **`gamingZone`** → Settings shows `enabled`, an hourly `interval`, and a **Timeout of 900**; Deployments/Executions shows runs. If you still have the old `rss-fetch`, `free-games-fetch`, `weekly-summary`, or `cron-job` functions, delete them in the console (they were replaced by this single function).

## One function only

Appwrite keeps firing a function's schedule even when the function is **disabled** in the console, and on this server the schedule lives in the `interval` field (minutes — `60` = hourly), not in the legacy `schedule` field the SDK writes. Switching a duplicate off therefore means writing `interval: 0` together with `enabled: false`.

Both functions used to run this dispatcher hourly, racing each other on the live database:

- **`gamingZone`** (`6ac81314002e085236df`) — the original deployment of this backend, and the one carrying the Git integration. **This is the survivor.**
- **`cron`** ("Game Jobs Cron") — a second function the repo tooling created later. It was retired first (`interval: 0` + `enabled: false`, which is reversible and keeps its deployment history and variables) and then **deleted on 2026-10-19**, after the survivor had completed a verified scheduled tick with its variables already synced.

`RETIRED_FUNCTIONS` in `scripts/functions/config.mjs` is the list the deploy switches off; it is intentionally empty now. If another duplicate ever appears, add its `{ id, name }` there and run:

```sh
cd apps/backend
npm run functions:deploy -- --retired-only   # only retire listed duplicates; leaves `gamingZone` config/variables untouched
npm run functions:deploy                     # the normal deploy enforces it too
```

Entries for functions that no longer exist are skipped, so a stale id can't break a deploy.

Required function variables mirror `scripts/lib/config.ts`:

```
APPWRITE_ENDPOINT       https://<region>.cloud.appwrite.io/v1
APPWRITE_PROJECT        <project id>
APPWRITE_API_KEY        <server api key with functions + database scopes>
APPWRITE_DATABASE_ID    <database id>
GEMINI_API_KEY          <gemini key>
GROQ_API_KEY            <groq key used as AI fallback>
GROQ_MODEL              openai/gpt-oss-120b  (default)
GROQ_MODELS             (optional) Groq fallback order, comma-separated
                        (default: openai/gpt-oss-120b,openai/gpt-oss-20b; generative models only)
CEREBRAS_API_KEY        <cerebras key used as final AI fallback>
CEREBRAS_MODELS         (optional) Cerebras fallback order, comma-separated
                        (default: gpt-oss-120b,qwen-3.8-27b; generative models only)
AI_CHAIN                (optional) model fallback chain for AI jobs; default:
                        gemini/gemini-2.5-flash,gemini/gemini-3.1-flash-lite,groq/openai/gpt-oss-120b,groq/openai/gpt-oss-20b
FCM_SERVICE_ACCOUNT     <minified firebase service account json>
RSS_COLLECTION_ID       news_sources           (default)
ARTICLES_COLLECTION_ID  articles               (default)
FREE_GAMES_COLLECTION_ID free_games            (default)
SUMMARIES_COLLECTION_ID weekly_summaries       (default)
TWITCH_CLIENT_ID        <twitch app client id>
TWITCH_CLIENT_SECRET    <twitch app client secret>
```

Collection IDs fall back to the defaults above if omitted.

## Memory ceiling

The runtime is `s-0.5vcpu-512mb`, and the RSS job parses article pages with JSDOM. Symptom
when the container is killed: a tick dies mid-run and Appwrite reports a bare
`500 general_unknown` with **empty** logs and `errors` (Appwrite only delivers logs when an
execution finishes, so a killed container looks completely silent), and the console
"Create execution" button fails the same way because an empty body runs the scheduled set
(`rss` + `article-summaries`).

**The cause is the platform's own V8 flag, not the job's concurrency.** Appwrite launches
the entrypoint with an 8 GB heap limit inside the 512 MB container — the `diagnostics` job
reports it directly:

```
execArgv:        ["--max_old_space_size=8192"]
heapSizeLimitMb: 8195
```

Command-line flags beat `NODE_OPTIONS`, so that limit cannot be lowered from the environment
(V8 reads it during startup, so `v8.setFlagsFromString` from inside the bundle does not work
either — both verified). V8 therefore never feels pressure to collect, and RSS climbs to a
high-water mark the OS never reclaims. Measured on an identical 100-article workload:

| configuration                                  | peak RSS    | heap   |
| ---------------------------------------------- | ----------- | ------ |
| no cap (the platform's 8 GB limit)             | 950-1070 MB | 736 MB |
| `--max-old-space-size=256` on the command line | 384-445 MB  | 272 MB |

Capping concurrency instead does **not** work: allowing 1, 3 or 9 simultaneous parses moved
the peak by only ~40 MB either way, because RSS is a high-water mark of allocation churn.
The post-GC live set is only ~120 MB, so a 256 MB cap leaves ~2x headroom.

So the jobs run in a child process whose argv we control, and the entrypoint stays thin:

- `src/main.ts` → `dist/main.js` (~8 KB): schedules, responds, spawns. No service imports, so
  the parent idles around 60 MB and leaves the child the rest of the budget.
- `src/worker.ts` → `dist/worker.js` (~2.6 MB): every job, run as
  `node --max-old-space-size=256 dist/worker.js <job> <resultFile>`.

Parent + child share the single 512 MB cgroup, which is why the split matters: with the heavy
imports in the parent the tree peaked at 527 MB (over the limit), and at 397 MB once the
parent was thinned — ~115 MB of headroom.

The worker reports through a temp file, not a stream: stdout is unusable because dotenv and
pino write banners there regardless of the installed logger, and **Appwrite drops a child
process's stderr** (verified — only the parent's structured `log()` calls are recorded). So
the worker writes one JSON envelope holding the result _and_ its log lines, and the parent
replays those lines through `log()`. That keeps the RSS job's own
`Peak RSS: <n>MB / heap <n>MB` line visible — the number to watch — which measured **242 MB**
(heap 56 MB) on a 54-article run, against 466-522 MB before.

If the child dies anyway, the parent reports `job '<name>' died without a result (exit code N)`
instead of the platform's silent 500 — a visible failure either way.

## Manual trigger

The function runs all due jobs on its schedule; to run one specific job on demand:

```sh
curl -X POST "https://<region>.cloud.appwrite.io/v1/functions/6ac81314002e085236df/executions" \
  -H "X-Appwrite-Project: <project>" \
  -H "X-Appwrite-Key: <api key>" \
  -H "Content-Type: application/json" \
  -d '{"async":true,"method":"POST","path":"/","body":"{\"job\":\"free-games\"}"}'
```

Valid job names: `rss`, `article-summaries`, `free-games`, `weekly-summary`, `game-releases`, `diagnostics`. Drop `"async":true` to wait for the result synchronously (only for short runs / debugging).

`diagnostics` is the cheap one (no network, no DB): it returns the Node version, the
effective `NODE_OPTIONS`, `process.execArgv`, the V8 `heapSizeLimitMb` and current memory, so
you can check the memory budget without running a full tick.

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
