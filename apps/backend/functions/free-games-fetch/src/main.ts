import { createRunner } from '../../_shared/runner';
import {
  runFetchFreeGames,
  teardownFreeGamesService,
} from '../../../scripts/features/freeGames/freeGames.service';

export default createRunner('free-games', async () => {
  await runFetchFreeGames();
  await teardownFreeGamesService();
});