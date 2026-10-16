import type { AppwriteContext } from '../../_shared/runner';

import { runFetchRss } from '../../../scripts/features/rss/rss.service';
import type { RunFetchRssOptions } from '../../../scripts/features/rss/rss.service';
import {
  runFetchFreeGames,
  teardownFreeGamesService,
} from '../../../scripts/features/freeGames/freeGames.service';
import { runGenerateWeeklySummary } from '../../../scripts/features/summary/summary.service';
import { runBackfillArticleSummaries } from '../../../scripts/features/summary/articleSummary.service';
import {
  runCheckGameReleases,
  teardownGameReleasesService,
} from '../../../scripts/features/gameReleases/gameReleases.service';
import { setAppwriteLogger } from '../../../scripts/lib/logger';
import { getErrorMessage } from '../../../scripts/lib/errors';

// One Appwrite function, one native schedule ("0 * * * *" = hourly, UTC).
// Every tick runs against the server clock; free-games and weekly-summary
// fire only when their time window matches, so a single cron slot covers all
// three cadences. Hourly (not */5) keeps the full 69-source RSS sync inside
// Appwrite's free 100 GB-hours/month compute allowance. A manual /curl
// trigger can still run one job by name via a JSON body.
type JobOptions = RunFetchRssOptions;

const JOBS: Record<string, (options: JobOptions) => Promise<unknown>> = {
  rss: (options) => runFetchRss(options),
  'article-summaries': () => runBackfillArticleSummaries(),
  'free-games': async () => {
    await runFetchFreeGames();
    await teardownFreeGamesService();
  },
  'weekly-summary': () => runGenerateWeeklySummary(),
  'game-releases': async () => {
    await runCheckGameReleases();
    await teardownGameReleasesService();
  },
};

// Registered at module load so a failure deep inside a job is surfaced instead
// of silently killing the process. Appwrite reports a hard death as a generic
// 500 with no logs, which is exactly the signal we are trying to capture.
type AppwriteLogFn = (...args: unknown[]) => void;
let appwriteError: AppwriteLogFn | null = null;

function reportFatal(kind: string, cause: unknown): void {
  const message =
    cause instanceof Error ? `${cause.name}: ${cause.message}\n${cause.stack ?? ''}` : String(cause);
  // stderr may survive even when the platform drops structured logs.
  console.error(`cron: ${kind}: ${message}`);
  try {
    appwriteError?.(`cron: ${kind}: ${message}`);
  } catch {
    // Diagnostics must never take down the process.
  }
}

process.on('uncaughtException', (cause) => reportFatal('uncaughtException', cause));
process.on('unhandledRejection', (cause) => reportFatal('unhandledRejection', cause));

function optionsFromBody(body: string): JobOptions {
  try {
    const parsed = JSON.parse(body) as { options?: unknown };
    const options = parsed.options;
    if (options && typeof options === 'object') return options as JobOptions;
  } catch {
    // jobsFromBody already rejects unparseable bodies.
  }
  return {};
}

function jobsFromScheduledTick(now: Date): string[] {
  // RSS sync and the article-summary backfill both run every tick. The summary
  // job runs second so freshly created articles are summarized in the same
  // invocation without adding work to the ingestion path.
  const jobs: string[] = ['rss', 'article-summaries'];

  if (now.getUTCMinutes() === 0) {
    jobs.push('free-games');
  }

  // Game releases check runs once a day at 09:00 UTC
  if (now.getUTCHours() === 9 && now.getUTCMinutes() === 0) {
    jobs.push('game-releases');
  }

  // Exactly once: only the 12:00 tick can match minute 0 (weekly recap is not
  // idempotent — it creates a new document per run).
  if (now.getUTCDay() === 5 && now.getUTCHours() === 12 && now.getUTCMinutes() === 0) {
    jobs.push('weekly-summary');
  }

  return jobs;
}

function jobsFromBody(body: string): string[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return null;
  }

  const raw =
    typeof parsed === 'object' && parsed !== null &&
    Array.isArray((parsed as { jobs?: unknown }).jobs)
      ? (parsed as { jobs: unknown[] }).jobs
      : typeof parsed === 'object' && parsed !== null && 'job' in parsed
        ? [(parsed as { job: unknown }).job]
        : [];

  const jobs = raw.filter((job): job is string => typeof job === 'string' && job in JOBS);
  return [...new Set(jobs)];
}

export default async ({ req, res, log, error }: AppwriteContext) => {
  setAppwriteLogger(log, error);
  appwriteError = error;
  const startedAt = Date.now();
  const now = new Date();
  const hasBody = typeof req.body === 'string' && req.body.trim().length > 0;
  const options = hasBody ? optionsFromBody(req.body as string) : {};

  try {
    let jobs: string[];
    if (hasBody) {
      const requested = jobsFromBody(req.body as string);
      if (requested === null) {
        return res.json({ ok: false, function: 'cron', error: 'Invalid JSON body.' }, 400);
      }
      if (requested.length === 0) {
        return res.json(
          { ok: false, function: 'cron', error: `No known job. Known jobs: ${Object.keys(JOBS).join(', ')}` },
          400,
        );
      }
      jobs = requested;
    } else {
      jobs = jobsFromScheduledTick(now);
    }

    log(`cron: running [${jobs.join(', ')}] at ${now.toISOString()}`);

    const results: { job: string; ok: boolean; ms: number; result?: unknown; error?: string }[] = [];
    let allOk = true;

    for (const job of jobs) {
      const jobStartedAt = Date.now();
      try {
        const result = await JOBS[job](options);
        const ms = Date.now() - jobStartedAt;
        log(`cron: job '${job}' finished in ${ms}ms`);
        results.push({ job, ok: true, ms, result: result ?? null });
      } catch (cause) {
        allOk = false;
        const message = getErrorMessage(cause);
        error(`cron: job '${job}' failed: ${message}`);
        results.push({ job, ok: false, ms: Date.now() - jobStartedAt, error: message });
      }
    }

    log(`cron: finished in ${Date.now() - startedAt}ms`);
    return res.json({ ok: allOk, function: 'cron', jobs: results }, allOk ? 200 : 500);
  } catch (cause) {
    const message = getErrorMessage(cause);
    error(`cron: unhandled failure: ${message}`);
    return res.json({ ok: false, function: 'cron', error: message }, 500);
  } finally {
    appwriteError = null;
    setAppwriteLogger(null, null);
  }
};