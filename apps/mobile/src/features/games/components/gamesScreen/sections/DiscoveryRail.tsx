import React, { memo } from "react";
import { useRecommendedGames } from "../../../hooks/useRecommendedGames";
import type { RecommendedGamesState } from "../../../hooks/useRecommendedGames";
import { useDiscoveryRailDecision } from "./DiscoveryRailContext";
import { RecommendedGamesView } from "./RecommendedGames";
import { TrendingPlatformView } from "./TrendingPlatformSection";
import Popular from "./Popular";

/**
 * Placeholder state used while the fallback chain is still resolving: the
 * personalized skeleton, without mounting the recommendation hook (which may
 * turn out to be unnecessary for trending/popular users).
 */
const PENDING_RECOMMENDED_STATE: RecommendedGamesState = {
  recommendedGames: [],
  loading: true,
  basedOnGenre: null,
  hasLibraryGames: false,
  libraryReady: false,
};

/**
 * The personalized branch. Kept separate so `useRecommendedGames` (the only
 * heavy hook here) mounts **only** when the recommended rail is actually
 * chosen — the trending/popular branches never pay for a recommendation build.
 */
function RecommendedRail(): React.ReactElement | null {
  const state = useRecommendedGames();
  const { platform } = useDiscoveryRailDecision();

  // Library games exist but the recommender produced nothing: don't leave an
  // empty slot — degrade to the platform/popular fallbacks.
  const shouldFallback =
    !state.loading &&
    state.hasLibraryGames &&
    state.recommendedGames.length === 0;

  if (shouldFallback) {
    return platform ? <TrendingPlatformView platform={platform} /> : <Popular />;
  }

  return <RecommendedGamesView state={state} />;
}

/**
 * The games feed's single discovery rail, resolved as a fallback chain:
 *
 * 1. **Recommended** — the recommender has `playing` / `played` library input.
 * 2. **Trending on your platform** — no recommendation input, but a platform
 *    is set.
 * 3. **Popular** — neither signal is available (e.g. anonymous or new users).
 *
 * The decision is shared through `DiscoveryRailProvider` so the quick-action
 * chip can display the matching label. Exactly one rail renders, so only the
 * chosen rail's data hook mounts.
 */
function DiscoveryRail(): React.ReactElement | null {
  const { kind, ready, platform } = useDiscoveryRailDecision();

  // Still resolving: keep the personalized slot (skeleton) so the generic
  // fallback never flashes first, without starting a recommendation build that
  // may be discarded.
  if (!ready) return <RecommendedGamesView state={PENDING_RECOMMENDED_STATE} />;

  if (kind === "trending") {
    return platform ? <TrendingPlatformView platform={platform} /> : null;
  }

  if (kind === "popular") {
    return <Popular />;
  }

  return <RecommendedRail />;
}

export default memo(DiscoveryRail);
