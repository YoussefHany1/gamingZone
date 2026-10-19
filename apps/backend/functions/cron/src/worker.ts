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
// stdin. The result is written to <resultFile> as JSON, logs go to stderr, and
// the exit code signals success (0) or failure (non-zero). The result does NOT
// go to stdout because dotenv and pino write banners there regardless of the
// logger we install.
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
};

export const JOB_NAMES = Object.keys(JOBS);

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

async function main(): Promise<void> {
  const [job, resultFile] = process.argv.slice(2);
  if (!job || !(job in JOBS)) {
    console.error(`cron-worker: unknown job '${job ?? ''}'. Known jobs: ${JOB_NAMES.join(', ')}`);
    process.exit(2);
  }

  const options = parseOptions(await readStdin());

  // The job's own logs go to stderr so they flow through to Appwrite's log
  // capture via the parent's inherited stderr.
  setAppwriteLogger(console.error, console.error);

  try {
    const result = await JOBS[job](options);
    fs.writeFileSync(resultFile, JSON.stringify(result ?? null));
    process.exit(0);
  } catch (cause) {
    const message = getErrorMessage(cause);
    console.error(`cron-worker: job '${job}' failed: ${message}`);
    try {
      fs.writeFileSync(resultFile, JSON.stringify({ error: message }));
    } catch {
      // A failed write must not mask the original error.
    }
    process.exit(1);
  }
}

void main();
