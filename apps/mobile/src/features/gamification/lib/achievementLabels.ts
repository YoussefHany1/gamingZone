/**
 * The i18n keys for the gamification system.
 *
 * Every user-facing string in the feature resolves through one of these, so
 * a missing translation shows up as a missing key in one place instead of
 * being scattered across the components.
 */

/** The display name of an achievement, by id. */
export const ACHIEVEMENT_NAME_KEYS: Record<string, string> = {
  "first-review": "gamification.achievements.firstReview.name",
  reviewer: "gamification.achievements.reviewer.name",
  critic: "gamification.achievements.critic.name",
  "five-star-fan": "gamification.achievements.fiveStarFan.name",
  completionist: "gamification.achievements.completionist.name",
  curator: "gamification.achievements.curator.name",
  collector: "gamification.achievements.collector.name",
  marathoner: "gamification.achievements.marathoner.name",
};

/** The description of an achievement, by id. */
export const ACHIEVEMENT_DESCRIPTION_KEYS: Record<string, string> = {
  "first-review": "gamification.achievements.firstReview.description",
  reviewer: "gamification.achievements.reviewer.description",
  critic: "gamification.achievements.critic.description",
  "five-star-fan": "gamification.achievements.fiveStarFan.description",
  completionist: "gamification.achievements.completionist.description",
  curator: "gamification.achievements.curator.description",
  collector: "gamification.achievements.collector.description",
  marathoner: "gamification.achievements.marathoner.description",
};

/** The display name of a tier. */
export const TIER_LABEL_KEYS: Record<string, string> = {
  bronze: "gamification.tiers.bronze",
  silver: "gamification.tiers.silver",
  gold: "gamification.tiers.gold",
};
