const { axiosGetWithRetry } = require("../lib/http.cjs");

const { cleanSlug, cleanGameNameForSearch } = require("./helpers.cjs");

async function fetchSteamGames(steamApiUrl) {
  try {
    console.log("📥 Fetching from Steam (via GamerPower)...");
    const response = await axiosGetWithRetry(
      steamApiUrl,
      {},
      { label: "Steam feed" },
    );

    return response.data.map((game) => ({
      originalId: String(game.id),
      title: cleanGameNameForSearch(game.title),
      description: game.description || "",
      image: game.image,
      slug: `steam-${game.id}`,
      url: game.open_giveaway_url,
      store: "steam",
      type: "current",
      startDate: game.published_date,
      endDate: game.end_date,
      fetchedAt: new Date().toISOString(),
    }));
  } catch (error) {
    console.error(`⚠️ Steam Fetch failed: ${error.message}`);
    return [];
  }
}

async function fetchGogGames(gogApiUrl) {
  try {
    console.log("📥 Fetching from GOG (via GamerPower)...");
    const response = await axiosGetWithRetry(
      gogApiUrl,
      {},
      { label: "GOG feed" },
    );

    return response.data.map((game) => ({
      originalId: String(game.id),
      title: cleanGameNameForSearch(game.title),
      description: game.description || "",
      image: game.image,
      slug: `gog-${game.id}`,
      url: game.open_giveaway_url,
      store: "gog",
      type: "current",
      startDate: game.published_date,
      endDate: game.end_date,
      fetchedAt: new Date().toISOString(),
    }));
  } catch (error) {
    console.error(`⚠️ GOG Fetch failed: ${error.message}`);
    return [];
  }
}

function hasCurrentEpicOffer(game) {
  const promotions = game.promotions;
  if (!promotions?.promotionalOffers?.length) return false;
  const offer = promotions.promotionalOffers[0]?.promotionalOffers?.[0];
  return offer?.discountSetting?.discountPercentage === 0;
}

function hasUpcomingEpicOffer(game) {
  const promotions = game.promotions;
  if (!promotions?.upcomingPromotionalOffers?.length) return false;
  const offer = promotions.upcomingPromotionalOffers[0]?.promotionalOffers?.[0];
  return offer?.discountSetting?.discountPercentage === 0;
}

function normalizeEpicGame(item, type) {
  const imageUrl =
    item.keyImages?.find((i) => i.type === "Thumbnail")?.url ||
    item.keyImages?.[0]?.url ||
    null;

  const rawSlug =
    item.productSlug ||
    item.offerMappings?.[0]?.pageSlug ||
    item.urlSlug ||
    null;
  const title = item.title;
  const finalSlug = cleanSlug(rawSlug, title);

  const offer =
    type === "current"
      ? item.promotions.promotionalOffers[0].promotionalOffers[0]
      : item.promotions.upcomingPromotionalOffers[0].promotionalOffers[0];

  return {
    originalId: item.id,
    title,
    description: item.description || "",
    image: imageUrl,
    slug: finalSlug,
    store: "epic",
    url: `https://store.epicgames.com/en-US/p/${finalSlug}`,
    type,
    startDate: offer.startDate,
    endDate: offer.endDate,
    fetchedAt: new Date().toISOString(),
  };
}

async function fetchEpicGames(epicApiUrl) {
  try {
    console.log("📥 Fetching from Epic Games...");
    const response = await axiosGetWithRetry(
      epicApiUrl,
      {},
      { label: "Epic feed" },
    );
    const allGames = response.data.data.Catalog.searchStore.elements;

    const currentGames = allGames
      .filter(hasCurrentEpicOffer)
      .map((game) => normalizeEpicGame(game, "current"));

    const nextGames = allGames
      .filter(hasUpcomingEpicOffer)
      .map((game) => normalizeEpicGame(game, "next"));

    return [...currentGames, ...nextGames];
  } catch (error) {
    throw new Error(`Fetch failed: ${error.message}`);
  }
}

module.exports = {
  fetchSteamGames,
  fetchGogGames,
  fetchEpicGames,
};
