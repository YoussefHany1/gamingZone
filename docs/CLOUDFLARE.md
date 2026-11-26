# Deploying the web app to Cloudflare Workers

The Next.js app in `apps/web` runs on Cloudflare Workers through
[`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare). ISR data is
stored in R2, while a Durable Object queue and sharded tag cache handle
time-based and on-demand revalidation.

## 1. Prerequisites

- Node.js 20+ and npm
- A Cloudflare account
- Wrangler authenticated locally (`npx wrangler login`)
- A registered `workers.dev` subdomain for the account. OpenNext starts a
  temporary remote Worker (`open-next-cache-populate`) to upload the R2
  incremental cache during deploy. Opening the Cloudflare **Workers & Pages**
  landing page once creates the subdomain automatically.

## 2. Environment variables

Copy `apps/web/.env.example` to `apps/web/.dev.vars` and fill in real values.
`.dev.vars` is used by `wrangler`/OpenNext local preview and is gitignored.

For deployed Workers, set every server-side value as a secret:

```bash
cd apps/web
npx wrangler secret put FIREBASE_CLIENT_EMAIL
npx wrangler secret put FIREBASE_PRIVATE_KEY
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put GROQ_API_KEY
npx wrangler secret put REVALIDATE_SECRET
# ...repeat for the other non-NEXT_PUBLIC_ values in .env.example
```

`NEXT_PUBLIC_*` values are embedded at build time, so set them in `.env`
(or in your CI build environment) before building.

## 3. Create the R2 cache bucket

The bucket name must match `wrangler.jsonc`:

```bash
cd apps/web
npx wrangler r2 bucket create gamingzone-web-opennext-cache
```

The Durable Object bindings and migrations are already declared in
`wrangler.jsonc`; Cloudflare creates them on first deploy.

## 4. Local preview (Workers runtime)

```bash
cd apps/web
npm run preview
```

This builds the app, populates the local R2 cache, and starts Wrangler at
`http://localhost:8787`.

For the regular Next.js dev server, keep using:

```bash
npm run dev
```

## 5. Deploy

```bash
cd apps/web
npm run deploy
```

`npm run deploy` builds the Next.js app, produces `.open-next/worker.js`, and
deploys it. Use `npm run upload` if you want to create a version without
switching production traffic immediately.

## 6. Auto-deploy on every push (Workers Builds)

Workers Builds connects the GitHub repository directly to the Worker, so every
push to `main` builds and deploys automatically. No GitHub Actions file or
GitHub secrets are needed.

1. Open [Workers & Pages](https://dash.cloudflare.com/87079aefb4d79e354998ec9ca1b85322/workers/workers-and-pages),
   select the `gamingzone-web` Worker, then go to **Settings > Build**.
2. Under **Git connection**, choose **Connect to Git** and use:

   | Setting | Value |
   | --- | --- |
   | Git account | GitHub (`YoussefHany1`) |
   | Repository | `YoussefHany1/gamingZone` |
   | Production branch | `main` |
   | Root directory | `apps/web` |

3. Override the build commands (the defaults are wrong for OpenNext):

   | Setting | Value |
   | --- | --- |
   | Build command | `npx opennextjs-cloudflare build` |
   | Deploy command | `npx opennextjs-cloudflare deploy` |

   `npm run build` only produces the plain Next.js output, and
   `npx wrangler deploy` skips the OpenNext bundle and the R2 cache population
   step. Both commands must be the OpenNext ones.

4. Add every value from `apps/web/.env.example` under **Build variables and
   secrets**. `next build` reads them while prerendering, and `.env` is not
   committed. The following nine are **required** — `src/lib/env.ts` throws
   during page-data collection if any are missing, which Next.js reports as
   `Failed to collect page data for /[locale]/social`:

   ```text
   NEXT_PUBLIC_FIREBASE_API_KEY
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
   NEXT_PUBLIC_FIREBASE_PROJECT_ID
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
   NEXT_PUBLIC_FIREBASE_APP_ID
   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
   NEXT_PUBLIC_CLOUDINARY_API_KEY
   NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
   ```

   Add them as plain **build variables** (not just runtime secrets under
   Settings > Variables & Secrets). The chat limits
   (`TOKEN_MARGIN_GEMINI`, `TOKEN_MARGIN_GROQ`, `CHAT_DAILY_REQ_LIMIT`,
   `CHAT_DAILY_TOKEN_LIMIT`) are optional because the code has defaults.
   - Secret: `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `GEMINI_API_KEY`,
     `GROQ_API_KEY`, `REVALIDATE_SECRET`, `APPWRITE_DATABASE_ID`.

   The runtime API credentials (Firebase, Gemini, Groq, revalidation) must also
   be set as runtime secrets (step 5), because build variables are not injected
   into the deployed Worker.

5. Keep the runtime secrets in **Settings > Variables & Secrets**. Build
   variables are only available during the build, not in the deployed Worker.
   The following are already set on the Worker and do not need to be re-added:
   `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `GEMINI_API_KEY`,
   `GROQ_API_KEY`, `REVALIDATE_SECRET`, `REVALIDATE_URL`.

6. Leave **preview builds** disabled for now. Their default command is
   `npx wrangler preview`, which does not deploy an OpenNext Worker.

7. Commit and push your changes to `main`, then watch the build under the
   Worker's **Deployments** tab. A successful build shows a new deployment with
   the pushed commit message.

Note: the migration changes in this working tree are still uncommitted. Push
them to `main` before expecting CI to build the Cloudflare-compatible version.

## Notes

- `firebase-admin` is intentionally **not** used in the Worker. Server-side
  Firebase Auth and Firestore access lives in `src/lib/firebase-admin.ts` and
  uses Web Crypto + REST so it works in `workerd`.
- Next.js image optimization is disabled (`images.unoptimized: true`), so no
  Cloudflare Images binding is required.
- `public/_headers` restores immutable caching for `/_next/static/*`, because
  Cloudflare Static Assets bypasses `next.config.ts` headers.
- OpenNext prints a Windows compatibility warning. The build works, but WSL is
  recommended for CI/production builds.
- If deploy fails while "Populating remote R2 incremental cache" with
  `Failed to send request to R2 worker ... timeout`, check that the account has
  a `workers.dev` subdomain. Alternatively, use
  `npx opennextjs-cloudflare deploy --rclone` with `R2_ACCESS_KEY_ID`,
  `R2_SECRET_ACCESS_KEY`, and `CF_ACCOUNT_ID` set, plus the optional
  `rclone.js` peer dependency installed.
