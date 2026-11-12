import { useUserPlatform } from "@/src/hooks/useUserPlatform";
import type { UserPlatform } from "@/src/hooks/useUserPlatform";
import { useLibraryHasGames } from "./useLibraryHasGames";

/** Which rail the discovery slot should render. */
export type DiscoveryRailKind = "recommended" | "trending" | "popular";

export type DiscoveryRailDecision = {
  /** The resolved (or provisional) rail to render. */
  kind: DiscoveryRailKind;
  /** True once the rail can be picked without a generic fallback flashing. */
  ready: boolean;
  /** The profile platform, so the trending rail needs no second read. */
  platform: UserPlatform | null;
};

/**
 * Resolves the games feed's discovery fallback chain:
 *
 * - the recommender has library input (`playing` / `played`) → `recommended`
 * - otherwise, platform set → `trending`
 * - neither → `popular`
 *
 * While still resolving it reports `recommended` (the personalized skeleton),
 * so the generic fallback never flashes before the library check completes.
 * The library decision is taken first, so a personalized rail never waits on
 * the profile-platform read.
 */
export function useDiscoveryRailKind(): DiscoveryRailDecision {
  const { hasGames, ready: libraryReady } = useLibraryHasGames();
  const { platform, loading: platformLoading } = useUserPlatform();

  if (!libraryReady) {
    return { kind: "recommended", ready: false, platform: null };
  }

  if (hasGames) return { kind: "recommended", ready: true, platform };

  if (platformLoading) {
    return { kind: "recommended", ready: false, platform: null };
  }

  if (platform) return { kind: "trending", ready: true, platform };
  return { kind: "popular", ready: true, platform };
}
