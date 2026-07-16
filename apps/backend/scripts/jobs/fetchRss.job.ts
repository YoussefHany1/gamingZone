import { logger } from '../lib/logger';

import { runFetchRss } from '../features/rss/rss.service';

runFetchRss()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error(error, 'Fatal Error');
    process.exit(1);
  });
