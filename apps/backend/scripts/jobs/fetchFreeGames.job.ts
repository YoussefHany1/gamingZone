import { logger } from '../lib/logger';

import { runFetchFreeGames } from '../features/freeGames/freeGames.service';

runFetchFreeGames()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error(error, 'Fatal Error');
    process.exit(1);
  });
