import { axiosGetWithRetry } from '../../lib/http';
import { cleanSlug, cleanGameNameForSearch } from './helpers';

export interface GamerPowerGame {
  id: string | number;
  title: string;
  description?: string;
  image: string;
  open_giveaway_url: string;
  published_date: string;
  end_date: string;
}

export interface EpicOffer {
  startDate: string;
  endDate: string;
  discountSetting?: { discountPercentage: number };
}

export interface EpicPromotionalOffer {
  promotionalOffers?: EpicOffer[];
}

export interface EpicGame {
  id: string;
  title: string;
  description?: string;
  keyImages?: { type: string; url: string }[];
  productSlug?: string;
  offerMappings?: { pageSlug: string }[];
  urlSlug?: string;
  promotions?: {
    promotionalOffers?: EpicPromotionalOffer[];
    upcomingPromotionalOffers?: EpicPromotionalOffer[];
  };
}

export interface NormalizedGame {
  originalId: string;
  title: string | undefined | null;
  description: string;
  image: string | null;
  slug: string;
  url: string;
  store: string;
  type: 'current' | 'next';
  startDate: string | null;
  endDate: string | null;
  fetchedAt: string;
}

function parseDate(dateStr: string | null | undefined): string | null {
  if (!dateStr || dateStr.toUpperCase() === 'N/A') return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

async function fetchSteamGames(steamApiUrl: string): Promise<NormalizedGame[]> {
  try {
    console.log('📥 Fetching from Steam (via GamerPower)...');
    const response = await axiosGetWithRetry(steamApiUrl, {}, { label: 'Steam feed' });

    if (!Array.isArray(response.data)) return [];
    return response.data.map((game: GamerPowerGame) => ({
      originalId: String(game.id),
      title: cleanGameNameForSearch(game.title),
      description: game.description || '',
      image: game.image,
      slug: `steam-${game.id}`,
      url: game.open_giveaway_url,
      store: 'steam',
      type: 'current',
      startDate: parseDate(game.published_date),
      endDate: parseDate(game.end_date),
      fetchedAt: new Date().toISOString(),
    }));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`⚠️ Steam Fetch failed: ${errorMessage}`);
    return [];
  }
}

async function fetchGogGames(gogApiUrl: string): Promise<NormalizedGame[]> {
  try {
    console.log('📥 Fetching from GOG (via GamerPower)...');
    const response = await axiosGetWithRetry(gogApiUrl, {}, { label: 'GOG feed' });

    if (!Array.isArray(response.data)) return [];
    return response.data.map((game: GamerPowerGame) => ({
      originalId: String(game.id),
      title: cleanGameNameForSearch(game.title),
      description: game.description || '',
      image: game.image,
      slug: `gog-${game.id}`,
      url: game.open_giveaway_url,
      store: 'gog',
      type: 'current',
      startDate: parseDate(game.published_date),
      endDate: parseDate(game.end_date),
      fetchedAt: new Date().toISOString(),
    }));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`⚠️ GOG Fetch failed: ${errorMessage}`);
    return [];
  }
}

function hasCurrentEpicOffer(game: EpicGame): boolean {
  const promotions = game.promotions;
  if (!promotions?.promotionalOffers?.length) return false;
  const offer = promotions.promotionalOffers[0]?.promotionalOffers?.[0];
  return offer?.discountSetting?.discountPercentage === 0;
}

function hasUpcomingEpicOffer(game: EpicGame): boolean {
  const promotions = game.promotions;
  if (!promotions?.upcomingPromotionalOffers?.length) return false;
  const offer = promotions.upcomingPromotionalOffers[0]?.promotionalOffers?.[0];
  return offer?.discountSetting?.discountPercentage === 0;
}

function normalizeEpicGame(item: EpicGame, type: 'current' | 'next'): NormalizedGame {
  const imageUrl =
    item.keyImages?.find((i) => i.type === 'Thumbnail')?.url || item.keyImages?.[0]?.url || null;

  const rawSlug = item.productSlug || item.offerMappings?.[0]?.pageSlug || item.urlSlug || null;
  const title = item.title;
  const finalSlug = cleanSlug(rawSlug, title);

  const offer =
    type === 'current'
      ? item.promotions!.promotionalOffers![0].promotionalOffers![0]
      : item.promotions!.upcomingPromotionalOffers![0].promotionalOffers![0];

  return {
    originalId: item.id,
    title,
    description: item.description || '',
    image: imageUrl,
    slug: finalSlug,
    store: 'epic',
    url: `https://store.epicgames.com/en-US/p/${finalSlug}`,
    type,
    startDate: parseDate(offer?.startDate),
    endDate: parseDate(offer?.endDate),
    fetchedAt: new Date().toISOString(),
  };
}

async function fetchEpicGames(epicApiUrl: string): Promise<NormalizedGame[]> {
  try {
    console.log('📥 Fetching from Epic Games...');
    const response = await axiosGetWithRetry(epicApiUrl, {}, { label: 'Epic feed' });
    const allGames: EpicGame[] = response.data.data.Catalog.searchStore.elements;

    const currentGames = allGames
      .filter(hasCurrentEpicOffer)
      .map((game) => normalizeEpicGame(game, 'current'));

    const nextGames = allGames
      .filter(hasUpcomingEpicOffer)
      .map((game) => normalizeEpicGame(game, 'next'));

    return [...currentGames, ...nextGames];
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`⚠️ Epic Fetch failed: ${errorMessage}`);
    return [];
  }
}

export { fetchSteamGames, fetchGogGames, fetchEpicGames };
