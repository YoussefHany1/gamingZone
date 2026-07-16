import { logger } from '../lib/logger';

import { runGenerateWeeklySummary } from '../features/summary/summary.service';

runGenerateWeeklySummary()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error(error, 'Fatal Error');
    process.exit(1);
  });
