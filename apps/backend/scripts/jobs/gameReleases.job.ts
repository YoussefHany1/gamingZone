import { logger } from '../lib/logger';
import {
  runCheckGameReleases,
  teardownGameReleasesService,
} from '../features/gameReleases/gameReleases.service';

runCheckGameReleases()
  .then(async () => {
    await teardownGameReleasesService();
    setTimeout(() => process.exit(0), 250);
  })
  .catch((error) => {
    logger.error(error, 'Fatal Error in game releases job');
    setTimeout(() => process.exit(1), 250);
  });
