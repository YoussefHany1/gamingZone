import { logger } from '../lib/logger';

import { runBackfillArticleSummaries } from '../features/summary/articleSummary.service';
import type { BackfillOptions } from '../features/summary/articleSummary.service';
import { parseBackfillLimit } from '../features/summary/articleSummary.shared';

// Optional `--limit <n>` (or `SUMMARY_BACKFILL_LIMIT`) caps how many articles a
// single run processes — handy for a cheap staging smoke test. Unset, the run
// uses the normal production batch sizes (20 newest + 10 oldest).
//
// `parseBackfillLimit` only ever returns a positive integer (or `undefined`), so
// `NaN`/`0`/negative values can't reach `Query.limit`. When a limit is set we
// keep only the newest queue and set `oldest: 0`, which the service treats as
// "skip" (never `Query.limit(0)`).
const limit = parseBackfillLimit(process.argv.slice(2), process.env.SUMMARY_BACKFILL_LIMIT);
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
