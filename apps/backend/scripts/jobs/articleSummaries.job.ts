import { logger } from '../lib/logger';

import { runBackfillArticleSummaries } from '../features/summary/articleSummary.service';
import type { BackfillOptions } from '../features/summary/articleSummary.service';

// Optional `--limit <n>` (or `SUMMARY_BACKFILL_LIMIT`) caps how many articles a
// single run processes — handy for a cheap staging smoke test. Unset, the run
// uses the normal production batch sizes (20 newest + 10 oldest).
function parseLimit(): number | undefined {
  const argv = process.argv.slice(2);

  const readNumber = (raw: string | undefined): number | undefined => {
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : undefined;
  };

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--limit') return readNumber(argv[i + 1]);
    if (argv[i].startsWith('--limit=')) return readNumber(argv[i].slice('--limit='.length));
  }

  return readNumber(process.env.SUMMARY_BACKFILL_LIMIT);
}

const limit = parseLimit();
const options: BackfillOptions = limit ? { newest: limit, oldest: 0 } : {};

if (limit) {
  logger.info(`🔬 Limiting this run to ${limit} article(s) for a smoke test.`);
}

runBackfillArticleSummaries(options)
  .then((stats) => {
    logger.info(stats, 'Summary backfill complete');
    // Allow a short delay for final logs to flush before terminating
    setTimeout(() => process.exit(0), 250);
  })
  .catch((error) => {
    logger.error(error, 'Fatal Error');
    setTimeout(() => process.exit(1), 250);
  });
