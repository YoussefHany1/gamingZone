import { logger } from '../lib/logger';

import { runGenerateWeeklySummary } from '../features/summary/summary.service';

runGenerateWeeklySummary()
  .then(() => {
    // Allow a short delay for final logs to flush before terminating
    setTimeout(() => process.exit(0), 250);
  })
  .catch((error) => {
    logger.error(error, 'Fatal Error');
    setTimeout(() => process.exit(1), 250);
  });
