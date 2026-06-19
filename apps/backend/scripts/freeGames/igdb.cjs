const { axiosGetWithRetry } = require("../lib/http.cjs");

const { cleanGameNameForSearch } = require("./helpers.cjs");

async function searchIgdbGameId(gameName, apiBaseUrl) {
  const cleanName = cleanGameNameForSearch(gameName);

  try {
    const response = await axiosGetWithRetry(
      `${apiBaseUrl}/search-game-id`,
      {
        params: { name: cleanName },
        timeout: 10000,
      },
      { label: `IGDB lookup (${cleanName})` },
    );

    return response.data.igdb_id || null;
  } catch (error) {
    console.log(
      `   ⚠️ Failed to get IGDB ID for "${cleanName}": ${error.message}`,
    );
    return null;
  }
}

module.exports = {
  searchIgdbGameId,
};
