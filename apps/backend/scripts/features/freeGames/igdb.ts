import { axiosGetWithRetry } from '../../lib/http';
import { getErrorMessage } from '../../lib/errors';

import { cleanGameNameForSearch } from './helpers';

async function searchIgdbGameId(gameName: string, apiBaseUrl: string): Promise<string | null> {
  const cleanName = cleanGameNameForSearch(gameName);

  try {
    const response = await axiosGetWithRetry<{ igdb_id?: number }>(
      `${apiBaseUrl}/search-game-id`,
      {
        params: { name: cleanName },
        timeout: 10000,
      },
      { label: `IGDB lookup (${cleanName})` },
    );

    const igdbId = response.data.igdb_id;
    return igdbId == null ? null : String(igdbId);
  } catch (error) {
    console.log(`   ⚠️ Failed to get IGDB ID for "${cleanName}": ${getErrorMessage(error)}`);
    return null;
  }
}

export { searchIgdbGameId };
