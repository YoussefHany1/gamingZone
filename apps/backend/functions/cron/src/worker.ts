// Job worker for the gamingZone function.
//
// Runs ONE job per process, so its heap can be bounded at startup: Appwrite
// launches the function entrypoint with `--max_old_space_size=8192` inside a
// 512 MB container, and command-line flags beat NODE_OPTIONS, so the entrypoint
// cannot lower its own limit. This file is spawned with an explicit
// `--max-old-space-size` by main.ts instead, and the entrypoint stays light
// (no service imports) so parent + child fit in the container's memory.
//
// Protocol: `node worker.js <job> <resultFile>` with the job options as JSON on
// stdin. The result AND the job's log lines are written to <resultFile> as one
// JSON envelope, and the exit code signals success (0) or failure (non-zero).
//
// Neither stream is used for the payload: stdout is unusable because dotenv and
// pino write banners there regardless of the installed logger, and stderr is
// dropped by Appwrite's log capture when it comes from a child process (only the
// parent's structured `log()` calls are recorded). So the parent replays this
// envelope's lines through `log()` to keep the job's output visible — including
// the RSS job's own "Peak RSS" line, which is the memory telemetry for this fix.
import fs from 'node:fs';

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
import { runSessionReminders } from './sessionReminders';
import { setAppwriteLogger } from '../../../scripts/lib/logger';
import { getErrorMessage } from '../../../scripts/lib/errors';

export type JobOptions = RunFetchRssOptions;

/** Every job the scheduler can dispatch, by name. */
export const JOBS: Record<string, (options: JobOptions) => Promise<unknown>> = {
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
  'session-reminders': () => runSessionReminders(),
};

export const JOB_NAMES = Object.keys(JOBS);

/** Cap on replayed lines, so a chatty run cannot bloat the envelope. */
const MAX_LOG_LINES = 400;

interface WorkerEnvelope {
  ok: boolean;
  result?: unknown;
  error?: string;
  logs: string[];
}

function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    process.stdin.on('data', (chunk: Buffer) => chunks.push(chunk));
    process.stdin.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
}

function parseOptions(raw: string): JobOptions {
  try {
    const parsed = JSON.parse(raw || '{}') as { options?: unknown };
    const options = parsed.options;
    if (options && typeof options === 'object') return options as JobOptions;
  } catch {
    // The parent always sends valid JSON; fall back to defaults regardless.
  }
  return {};
}

function formatLogArg(arg: unknown): string {
  if (typeof arg === 'string') return arg;
  if (arg instanceof Error) return arg.stack ?? arg.message;
  try {
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
}

async function main(): Promise<void> {
  const [job, resultFile] = process.argv.slice(2);

  // Collect every log line the job emits, and keep stderr as a fallback mirror
  // for crashes that happen before the envelope is written.
  const logs: string[] = [];
  setAppwriteLogger(
    (...args: unknown[]) => {
      const line = args.map(formatLogArg).join(' ');
      if (logs.length < MAX_LOG_LINES) logs.push(line);
      console.error(line);
    },
    (...args: unknown[]) => {
      const line = args.map(formatLogArg).join(' ');
      if (logs.length < MAX_LOG_LINES) logs.push(line);
      console.error(line);
    },
  );

  const writeEnvelope = (envelope: WorkerEnvelope): void => {
    try {
      fs.writeFileSync(resultFile, JSON.stringify(envelope));
    } catch {
      // A failed write must not mask the original outcome.
    }
  };

  if (!job || !(job in JOBS)) {
    const message = `unknown job '${job ?? ''}'. Known jobs: ${JOB_NAMES.join(', ')}`;
    console.error(`cron-worker: ${message}`);
    writeEnvelope({ ok: false, error: message, logs });
    process.exit(2);
  }

  const options = parseOptions(await readStdin());

  try {
    const result = await JOBS[job](options);
    writeEnvelope({ ok: true, result: result ?? null, logs });
    process.exit(0);
  } catch (cause) {
    const message = getErrorMessage(cause);
    console.error(`cron-worker: job '${job}' failed: ${message}`);
    writeEnvelope({ ok: false, error: message, logs });
    process.exit(1);
  }
}

void main();
