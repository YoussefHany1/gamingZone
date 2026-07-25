import { logger } from '../lib/logger';

import { runFetchFreeGames, teardownFreeGamesService } from '../features/freeGames/freeGames.service';

runFetchFreeGames()
  .then(async () => {
    await teardownFreeGamesService();
    // Allow a short delay for final logs to flush before terminating
    setTimeout(() => process.exit(0), 250);
  })
  .catch(async (error) => {
    logger.error(error, 'Fatal Error');
    await teardownFreeGamesService();
    setTimeout(() => process.exit(1), 250);
  });
