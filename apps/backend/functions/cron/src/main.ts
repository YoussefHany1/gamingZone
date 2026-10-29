// Entrypoint for the single gamingZone Appwrite function.
//
// One Appwrite function, one native schedule ("0 * * * *" = hourly, UTC). Every
// tick runs against the server clock; free-games and weekly-summary fire only
// when their time window matches, so a single cron slot covers all three
// cadences. Hourly (not */5) keeps the full 69-source RSS sync inside
// Appwrite's free 100 GB-hours/month compute allowance. A manual /curl trigger
// can still run one job by name via a JSON body.
//
// This file is deliberately thin: it schedules and it spawns. The jobs
// themselves live in worker.ts, which is run as a child process with a bounded
// heap (see HEAP_CAPPED_JOBS) because Appwrite launches this entrypoint with
// `--max_old_space_size=8192` inside a 512 MB container — a command-line flag
// that overrides NODE_OPTIONS and cannot be lowered from inside the process.
// Keeping the service imports (jsdom, firebase-admin, got-scraping, ...) out of
// this file is what leaves room for the child: parent + child share the one
// 512 MB budget.
import type { AppwriteContext } from '../../_shared/runner';

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { getHeapStatistics } from 'node:v8';

import { getErrorMessage } from '../../../scripts/lib/errors';

type JobOptions = Record<string, unknown>;

/** Every job the worker knows how to run. Kept in sync with worker.ts. */
const JOB_NAMES = [
  'rss',
  'article-summaries',
  'free-games',
  'weekly-summary',
  'game-releases',
  'session-reminders',
  'diagnostics',
] as const;

/**
 * Old-space cap for the job child process, in MB.
 *
 * The RSS job parses article pages with JSDOM. V8's default old-space limit
 * follows the host's RAM, not the container's, so with Appwrite's own
 * `--max_old_space_size=8192` the heap ballooned before V8 felt pressure to
 * collect: the same script peaked at 950-1070 MB of RSS versus 384-445 MB when
 * the heap is capped at 256 MB, and the post-GC live set is only ~120 MB. Past
 * 512 MB the container is killed and Appwrite reports a bare
 * `500 general_unknown` with no logs, so every job runs in a child whose argv
 * we control.
 */
const CHILD_HEAP_MB = 256;

/** How long a job may run before the child is killed. Matches the function timeout. */
const CHILD_TIMEOUT_MS = 900_000;

/**
 * Runs one job in a child Node process with a bounded heap, and returns its
 * result.
 *
 * The child cannot report through stdout (dotenv/pino banners) or stderr
 * (Appwrite drops a child's stderr), so it writes an envelope to a temp file and
 * this function replays its log lines through `log()`. That is what keeps the
 * RSS job's `Peak RSS` line — the memory telemetry for this whole arrangement —
 * visible in the execution logs.
 */
function runJobInChild(
  job: string,
  options: JobOptions,
  log: (...args: unknown[]) => void,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const resultFile = path.join(
      os.tmpdir(),
      `gamingzone-${job}-${process.pid}-${Date.now()}.json`,
    );
    const workerPath = path.join(__dirname, 'worker.js');

    const child = spawn(
      process.execPath,
      [`--max-old-space-size=${CHILD_HEAP_MB}`, workerPath, job, resultFile],
      { stdio: ['pipe', 'ignore', 'ignore'], env: process.env },
    );

    const cleanup = () => {
      try {
        fs.unlinkSync(resultFile);
      } catch {
        // Already gone, or never written.
      }
    };

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`job '${job}' exceeded ${CHILD_TIMEOUT_MS / 1000}s and was killed`));
    }, CHILD_TIMEOUT_MS);

    child.on('error', (cause) => {
      clearTimeout(timer);
      cleanup();
      reject(cause);
    });

    child.on('close', (code, signal) => {
      clearTimeout(timer);

      let output: string | null = null;
      try {
        output = fs.readFileSync(resultFile, 'utf8');
      } catch {
        // No result file: the child died before writing one.
      }
      cleanup();

      if (output === null) {
        const how = signal ? `signal ${signal}` : `exit code ${code}`;
        // The classic signature here is a kill for exceeding the container's
        // 512 MB, which otherwise reports no logs at all.
        reject(new Error(`job '${job}' died without a result (${how})`));
        return;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(output);
      } catch {
        reject(new Error(`job '${job}' produced unparseable output: ${output.slice(0, 300)}`));
        return;
      }

      const envelope = (typeof parsed === 'object' && parsed !== null ? parsed : {}) as {
        ok?: boolean;
        result?: unknown;
        error?: unknown;
        logs?: unknown;
      };

      for (const line of Array.isArray(envelope.logs) ? envelope.logs : []) {
        log(typeof line === 'string' ? line : String(line));
      }

      if (code !== 0 || envelope.ok === false) {
        const message = envelope.error !== undefined ? String(envelope.error) : `exit code ${code}`;
        reject(new Error(message));
        return;
      }

      resolve(envelope.result ?? null);
    });

    child.stdin.end(JSON.stringify({ options }));
  });
}

/**
 * Reports the memory budget the process actually booted with.
 *
 * This exists because the runtime kills the container past 512 MB and only then
 * says so as a bare `500 general_unknown` with no logs. `heapSizeLimitMb`
 * shows the limit Appwrite's own command-line flag produced, which is why the
 * jobs run in a child that sets its own.
 */
function collectDiagnostics() {
  const usage = process.memoryUsage();
  const toMb = (bytes: number) => Math.round(bytes / 1048576);

  return {
    node: process.version,
    nodeOptions: process.env.NODE_OPTIONS ?? null,
    execArgv: process.execArgv,
    heapSizeLimitMb: toMb(getHeapStatistics().heap_size_limit),
    childHeapMb: CHILD_HEAP_MB,
    memory: {
      rssMb: toMb(usage.rss),
      heapUsedMb: toMb(usage.heapUsed),
      heapTotalMb: toMb(usage.heapTotal),
      externalMb: toMb(usage.external),
    },
  };
}

// Registered at module load so a failure deep inside a job is surfaced instead
// of silently killing the process. Appwrite reports a hard death as a generic
// 500 with no logs, which is exactly the signal we are trying to capture.
type AppwriteLogFn = (...args: unknown[]) => void;
let appwriteError: AppwriteLogFn | null = null;

function reportFatal(kind: string, cause: unknown): void {
  const message =
    cause instanceof Error
      ? `${cause.name}: ${cause.message}\n${cause.stack ?? ''}`
      : String(cause);
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
  const jobs: string[] = ['rss', 'article-summaries', 'session-reminders'];

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
    typeof parsed === 'object' &&
    parsed !== null &&
    Array.isArray((parsed as { jobs?: unknown }).jobs)
      ? (parsed as { jobs: unknown[] }).jobs
      : typeof parsed === 'object' && parsed !== null && 'job' in parsed
        ? [(parsed as { job: unknown }).job]
        : [];

  const jobs = raw.filter(
    (job): job is string =>
      typeof job === 'string' && (JOB_NAMES as readonly string[]).includes(job),
  );
  return [...new Set(jobs)];
}

export default async ({ req, res, log, error }: AppwriteContext) => {
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
          {
            ok: false,
            function: 'cron',
            error: `No known job. Known jobs: ${JOB_NAMES.join(', ')}`,
          },
          400,
        );
      }
      jobs = requested;
    } else {
      jobs = jobsFromScheduledTick(now);
    }

    log(`cron: running [${jobs.join(', ')}] at ${now.toISOString()}`);

    const results: { job: string; ok: boolean; ms: number; result?: unknown; error?: string }[] =
      [];
    let allOk = true;

    for (const job of jobs) {
      const jobStartedAt = Date.now();
      try {
        const result =
          job === 'diagnostics' ? collectDiagnostics() : await runJobInChild(job, options, log);
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
  }
};
