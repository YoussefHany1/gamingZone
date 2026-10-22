/**
 * Leveling and achievement rules.
 *
 * These are the single source of truth for how much XP an activity is worth
 * and how the level curve works. They are deliberately pure functions over
 * plain counters: no Firestore, no React, no clock. That matters for three
 * reasons:
 *
 *   1. The app can recompute a user's gamification state at any time from the
 *      data it already has, so there is no XP ledger to keep in sync.
 *   2. A future server-side implementation can import the very same rules and
 *      only has to change *who* calls them, not *what* they are.
 *   3. Every rule is unit-testable without a device or a network.
 *
 * No achievement criterion depends on the level or on XP — they all read raw
 * counts — so the derivation stays acyclic: counts → XP → level → achievements.
 */
import type {
  AchievementDefinition,
  AchievementMetric,
  AchievementState,
  GamificationState,
  GamificationStats,
  XpBreakdownEntry,
  XpReason,
} from "@gaming-zone/core";

// ---------------------------------------------------------------------------
// XP rewards
// ---------------------------------------------------------------------------

/** XP granted per unit of each activity. */
export const XP_REWARDS: Record<XpReason, number> = {
  /** Rating a game for the first time. */
  first_rating: 50,
  /** Rating a game five stars. */
  five_star_rating: 10,
  /** Marking a game as played. */
  game_played: 30,
  /** Tracking a game in one of the user's own lists. */
  game_tracked: 20,
};

/** i18n key for each XP source, used by the breakdown list. */
export const XP_REASON_LABEL_KEYS: Record<XpReason, string> = {
  first_rating: "gamification.xpSources.firstRating",
  five_star_rating: "gamification.xpSources.fiveStar",
  game_played: "gamification.xpSources.gamePlayed",
  game_tracked: "gamification.xpSources.gameTracked",
};

// ---------------------------------------------------------------------------
// Level curve
// ---------------------------------------------------------------------------

/** XP the first level costs. Every level after it costs 50 XP more. */
export const LEVEL_BASE_COST = 100;

/** How much each level costs more than the one before it. */
export const LEVEL_COST_GROWTH = 50;

/**
 * Total XP required to *reach* a level.
 *
 * Level 1 costs nothing, level 2 costs 100, level 3 costs 250, and every
 * level after that costs 50 XP more than the last — so the curve is
 * quadratic and stays interesting well past level 10.
 */
export function totalXpForLevel(level: number): number {
  const steps = Math.max(0, Math.floor(level) - 1);
  return LEVEL_BASE_COST * steps + (LEVEL_COST_GROWTH / 2) * steps * (steps - 1);
}

/**
 * The highest level reachable with the given amount of XP.
 *
 * Binary search over the (monotonic) level curve. A closed-form inverse
 * would be faster but rounds wrongly exactly on the boundaries — 99 XP has to
 * stay level 1 — so the search keeps the thresholds exact.
 */
export function levelForXp(xp: number): number {
  const safeXp = Math.max(0, counter(xp));
  let low = 1;
  let high = 2;
  while (totalXpForLevel(high) <= safeXp) {
    low = high;
    high *= 2;
  }
  while (low + 1 < high) {
    const mid = Math.floor((low + high) / 2);
    if (totalXpForLevel(mid) <= safeXp) low = mid;
    else high = mid;
  }
  return low;
}

/**
 * A number that is safe to do arithmetic with.
 *
 * The counters arrive from a cache that can predate a field, and a missing
 * counter would quietly turn the whole XP total into `NaN`. That is worse
 * than it sounds: `Math.max(NaN, x)` is `NaN`, so a single missing field
 * would poison the high-water mark for the whole session.
 */
function counter(value: number | undefined | null): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/** The XP cost of moving from `level` to `level + 1`. */
export function xpCostForNextLevel(level: number): number {
  return totalXpForLevel(level + 1) - totalXpForLevel(level);
}

/** Level, progress through it, and how far is left to the next one. */
export function levelProgressFor(xp: number): {
  level: number;
  xpIntoLevel: number;
  xpToNextLevel: number;
  levelProgress: number;
} {
  const safeXp = Math.max(0, counter(xp));
  const level = levelForXp(safeXp);
  const floor = totalXpForLevel(level);
  const xpIntoLevel = safeXp - floor;
  const xpToNextLevel = xpCostForNextLevel(level);
  return {
    level,
    xpIntoLevel,
    xpToNextLevel,
    levelProgress: xpToNextLevel > 0 ? Math.min(1, xpIntoLevel / xpToNextLevel) : 0,
  };
}

// ---------------------------------------------------------------------------
// Achievement catalog
// ---------------------------------------------------------------------------

/**
 * The badges. Order matters: the achievements screen renders them in this
 * order, grouped by tier.
 */
export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: "first-review",
    tier: "bronze",
    icon: "star",
    metric: "ratedCount",
    target: 1,
    xp: 25,
  },
  {
    id: "reviewer",
    tier: "silver",
    icon: "messageSquare",
    metric: "ratedCount",
    target: 10,
    xp: 50,
  },
  {
    id: "critic",
    tier: "gold",
    icon: "award",
    metric: "ratedCount",
    target: 50,
    xp: 150,
  },
  {
    id: "five-star-fan",
    tier: "silver",
    icon: "sparkles",
    metric: "fiveStarCount",
    target: 10,
    xp: 75,
  },
  {
    id: "completionist",
    tier: "silver",
    icon: "checkCircle",
    metric: "playedCount",
    target: 25,
    xp: 100,
  },
  {
    id: "curator",
    tier: "bronze",
    icon: "library",
    metric: "trackedCount",
    target: 25,
    xp: 50,
  },
  {
    id: "collector",
    tier: "gold",
    icon: "trophy",
    metric: "trackedCount",
    target: 100,
    xp: 200,
  },
  {
    id: "marathoner",
    tier: "silver",
    icon: "clock",
    metric: "playtimeHours",
    target: 50,
    xp: 100,
  },
];

/** Reads the counter an achievement watches. */
export function metricValue(
  metric: AchievementMetric,
  stats: GamificationStats,
): number {
  switch (metric) {
    case "ratedCount":
      return counter(stats.ratedCount);
    case "fiveStarCount":
      return counter(stats.fiveStarCount);
    case "playedCount":
      return counter(stats.playedCount);
    case "trackedCount":
      return counter(stats.trackedCount);
    case "playtimeHours":
      return counter(stats.playtimeHours);
    default:
      return 0;
  }
}

/**
 * Evaluates every badge against the counters.
 *
 * `previouslyUnlocked` is the ratchet: a badge that has been earned is never
 * taken back, even if the user later removes a game and the underlying count
 * drops below the target.
 */
export function evaluateAchievements(
  stats: GamificationStats,
  previouslyUnlocked: readonly string[] = [],
): AchievementState[] {
  const earned = new Set(previouslyUnlocked);

  return ACHIEVEMENTS.map((definition) => {
    const current = metricValue(definition.metric, stats);
    return {
      id: definition.id,
      tier: definition.tier,
      icon: definition.icon,
      unlocked: earned.has(definition.id) || current >= definition.target,
      current: Math.min(current, definition.target),
      target: definition.target,
      xp: definition.xp,
    };
  });
}

/** The ids of the badges whose criterion is currently met. */
export function satisfiedAchievementIds(stats: GamificationStats): string[] {
  return ACHIEVEMENTS.filter(
    (definition) => metricValue(definition.metric, stats) >= definition.target,
  ).map((definition) => definition.id);
}

// ---------------------------------------------------------------------------
// Derivation
// ---------------------------------------------------------------------------

/** The XP the raw counters currently account for, before any badge bonuses. */
export function activityXpFor(stats: GamificationStats): number {
  return (
    XP_REWARDS.first_rating * counter(stats.ratedCount) +
    XP_REWARDS.five_star_rating * counter(stats.fiveStarCount) +
    XP_REWARDS.game_played * counter(stats.playedCount) +
    XP_REWARDS.game_tracked * counter(stats.trackedCount)
  );
}

/** The total XP the current counters and badges account for. */
export function earnedXpFor(
  stats: GamificationStats,
  previouslyUnlocked: readonly string[] = [],
): number {
  const achievements = evaluateAchievements(stats, previouslyUnlocked);
  const achievementXp = achievements
    .filter((achievement) => achievement.unlocked)
    .reduce((sum, achievement) => sum + achievement.xp, 0);
  return activityXpFor(stats) + achievementXp;
}

/**
 * Builds the full gamification state.
 *
 * `totalXp` is a high-water mark: the result is never lower than what the
 * user already had, so removing a game can never take XP or a level away.
 * `calculatedXp` is kept alongside it so the breakdown can show where the XP
 * came from, including the surplus that is retained but no longer backed by
 * a live counter.
 */
export function computeGamification(
  stats: GamificationStats,
  options: {
    /** The XP high-water mark already reached. Defaults to the earned XP. */
    bankedXp?: number;
    /** Badge ids that have already been unlocked. */
    unlockedAchievementIds?: readonly string[];
  } = {},
): GamificationState {
  const previouslyUnlocked = options.unlockedAchievementIds ?? [];
  const activityXp = activityXpFor(stats);

  const achievements = evaluateAchievements(stats, previouslyUnlocked);
  const unlocked = achievements.filter((achievement) => achievement.unlocked);
  const achievementXp = unlocked.reduce((sum, achievement) => sum + achievement.xp, 0);

  const earnedXp = activityXp + achievementXp;
  const bankedXp = Math.max(counter(options.bankedXp), earnedXp);

  const breakdown: XpBreakdownEntry[] = [
    {
      reason: "first_rating",
      labelKey: XP_REASON_LABEL_KEYS.first_rating,
      amount: XP_REWARDS.first_rating * counter(stats.ratedCount),
    },
    {
      reason: "five_star_rating",
      labelKey: XP_REASON_LABEL_KEYS.five_star_rating,
      amount: XP_REWARDS.five_star_rating * counter(stats.fiveStarCount),
    },
    {
      reason: "game_played",
      labelKey: XP_REASON_LABEL_KEYS.game_played,
      amount: XP_REWARDS.game_played * counter(stats.playedCount),
    },
    {
      reason: "game_tracked",
      labelKey: XP_REASON_LABEL_KEYS.game_tracked,
      amount: XP_REWARDS.game_tracked * counter(stats.trackedCount),
    },
    {
      reason: "achievement",
      labelKey: "gamification.xpSources.achievements",
      amount: achievementXp,
    },
  ];

  // Anything the high-water mark holds above the live counters is reported
  // as its own line so the breakdown always adds up to the displayed total.
  const retained = bankedXp - earnedXp;
  if (retained > 0) {
    breakdown.push({
      reason: "retained",
      labelKey: "gamification.xpSources.retained",
      amount: retained,
    });
  }

  const progress = levelProgressFor(bankedXp);

  return {
    totalXp: bankedXp,
    level: progress.level,
    xpIntoLevel: progress.xpIntoLevel,
    xpToNextLevel: progress.xpToNextLevel,
    levelProgress: progress.levelProgress,
    calculatedXp: earnedXp,
    achievements,
    breakdown: breakdown.filter((entry) => entry.amount > 0),
  };
}

// ---------------------------------------------------------------------------
// The ratchet
// ---------------------------------------------------------------------------

/** The result of folding an authoritative derivation into the ratchet. */
export interface GamificationRatchet {
  /** The new high-water mark. Never lower than the one it started from. */
  totalXp: number;
  /** Every badge that has ever been unlocked. */
  unlockedAchievementIds: string[];
  /** The level the high-water mark reaches. */
  level: number;
  /**
   * How much XP this fold added. Never negative, and never a double count:
   * the ratchet takes the *maximum* of what was banked and what the counters
   * justify rather than their sum.
   */
  gained: number;
  /** The XP the live counters currently account for. */
  calculatedXp: number;
}

/**
 * Folds the authoritative derivation into the XP/level ratchet.
 *
 * This is the rule that makes the system safe to run on the client: XP and
 * badges are high-water marks, so removing a game can never take XP, a level
 * or a badge away, and a locally granted award can never be counted twice.
 *
 * `bankedXp` is what the user already has. The result is the greater of that
 * and what the counters now justify — never the sum, which is what keeps the
 * optimistic award path and the authoritative path from double-counting.
 */
export function foldGamification(
  bankedXp: number,
  unlockedAchievementIds: readonly string[],
  stats: GamificationStats,
): GamificationRatchet {
  // The high-water mark is sanitised before anything else touches it: a
  // single bad value here would otherwise survive every later fold, because
  // `Math.max` propagates `NaN`.
  const banked = counter(bankedXp);

  const derived = computeGamification(stats, {
    bankedXp: banked,
    unlockedAchievementIds,
  });

  // Badges are a union: one that was earned is never taken back.
  const unlocked = Array.from(
    new Set([
      ...unlockedAchievementIds,
      ...derived.achievements.filter((achievement) => achievement.unlocked).map((a) => a.id),
    ]),
  );

  const totalXp = Math.max(banked, derived.totalXp);

  return {
    totalXp,
    unlockedAchievementIds: unlocked,
    level: levelForXp(totalXp),
    gained: totalXp - banked,
    calculatedXp: derived.calculatedXp,
  };
}
