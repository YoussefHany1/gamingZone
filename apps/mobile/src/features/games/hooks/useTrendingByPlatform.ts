import { useSectionFeed } from "./useSectionFeed";
import { fetchTrendingGamesByPlatform } from "@/src/services/api/igdbApi";
import type { UserPlatform } from "@/src/hooks/useUserPlatform";

/**
 * The platform rails' cache keys: one per UserPlatform
 * (`GAMES_CACHE_TRENDING_PC`, `GAMES_CACHE_TRENDING_PLAYSTATION`, ...).
 *
 * The template and the prefix are load-bearing — byte-identical to the
 * legacy key builder, each platform owns an independent warm cache slot.
 */
function storageKeyForPlatform(platform: UserPlatform): string {
  return `GAMES_CACHE_TRENDING_${platform.toUpperCase()}`;
}

/**
 * Trending games for the user's platform, for the games feed's
 * `trending_platform` section.
 *
 * The `platform` is forwarded into `useSectionFeed`'s dependencies so the
 * rail re-fetches when the Firestore profile's platform changes — identical
 * to the legacy `useCachedData(..., [platform])` contract, not an
 * assumption about it.
 */
export function useTrendingByPlatform(platform: UserPlatform) {
  return useSectionFeed(
    storageKeyForPlatform(platform),
    () => fetchTrendingGamesByPlatform(platform),
    [platform],
  );
}
