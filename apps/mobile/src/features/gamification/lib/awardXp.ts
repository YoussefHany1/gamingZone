import { XP_REWARDS } from "@gaming-zone/utils";
import {
  useGamificationStore,
  XP_TOAST_LABEL_KEYS,
} from "@/src/store/useGamificationStore";
import { refreshUserStats } from "@/src/store/useUserStatsStore";

/**
 * The key an award for a game is paid under.
 *
 * The game id is part of the key, so every game is paid for on its own — and
 * the same game is never paid for twice.
 */
export const ratingAwardKey = (gameId: string | number): string =>
  `rating:${String(gameId)}`;

/**
 * Grants the XP for rating a game.
 *
 * Only the *first* rating of a game is worth XP: changing a rating later is
 * not new activity, and the counters the XP is derived from do not move when
 * it happens, so awarding it again would double-count.
 *
 * The award is applied to the ratchet locally so the "+50 XP" toast is
 * instant, and the shared statistics are then refreshed so the authoritative
 * derivation catches up — that is what raises a level-up.
 */
export function awardXpForRating(
  uid: string,
  gameId: string | number,
  rating: number,
  wasFirstRating: boolean,
): void {
  if (!uid) return;

  if (wasFirstRating) {
    let amount = XP_REWARDS.first_rating;
    if (rating === 5) amount += XP_REWARDS.five_star_rating;

    useGamificationStore
      .getState()
      .award(uid, amount, XP_TOAST_LABEL_KEYS.first_rating, ratingAwardKey(gameId));
  }

  // A quiet refresh: the counters changed, and the sync it triggers is what
  // turns the new total into a level. It runs even when no XP was awarded
  // locally, because the authoritative derivation may still be the one that
  // grants it.
  refreshUserStats(uid);
}
