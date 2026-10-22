import { describe, expect, it } from "vitest";
import type { GamificationStats } from "@gaming-zone/core";
import {
  ACHIEVEMENTS,
  XP_REWARDS,
  computeGamification,
  evaluateAchievements,
  foldGamification,
  levelForXp,
  levelProgressFor,
  totalXpForLevel,
  xpCostForNextLevel,
} from "./index";

const emptyStats: GamificationStats = {
  ratedCount: 0,
  fiveStarCount: 0,
  playedCount: 0,
  trackedCount: 0,
  playtimeHours: 0,
};

const stats = (overrides: Partial<GamificationStats> = {}): GamificationStats => ({
  ...emptyStats,
  ...overrides,
});

describe("totalXpForLevel", () => {
  it("starts at zero for level 1", () => {
    expect(totalXpForLevel(1)).toBe(0);
  });

  it("costs 50 XP more per level than the one before", () => {
    expect(totalXpForLevel(2)).toBe(100);
    expect(totalXpForLevel(3)).toBe(250);
    expect(totalXpForLevel(4)).toBe(450);
    expect(totalXpForLevel(5)).toBe(700);
    expect(totalXpForLevel(10)).toBe(2700);
  });

  it("never goes backwards for lower levels", () => {
    expect(totalXpForLevel(0)).toBe(0);
    expect(totalXpForLevel(-5)).toBe(0);
  });
});

describe("levelForXp", () => {
  it("maps XP to the highest reachable level", () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(99)).toBe(1);
    expect(levelForXp(100)).toBe(2);
    expect(levelForXp(249)).toBe(2);
    expect(levelForXp(250)).toBe(3);
    expect(levelForXp(2699)).toBe(9);
    expect(levelForXp(2700)).toBe(10);
  });

  it("treats negative XP as level 1", () => {
    expect(levelForXp(-50)).toBe(1);
  });

  it("agrees with the thresholds at every level", () => {
    for (let level = 1; level <= 40; level++) {
      expect(levelForXp(totalXpForLevel(level))).toBe(level);
      expect(levelForXp(totalXpForLevel(level) - 1)).toBe(level - 1 || 1);
    }
  });

  it("handles very large XP without stalling", () => {
    expect(levelForXp(1_000_000)).toBeGreaterThan(100);
  });
});

describe("xpCostForNextLevel", () => {
  it("grows by 50 each level", () => {
    expect(xpCostForNextLevel(1)).toBe(100);
    expect(xpCostForNextLevel(2)).toBe(150);
    expect(xpCostForNextLevel(3)).toBe(200);
  });
});

describe("levelProgressFor", () => {
  it("reports the progress through the current level", () => {
    const progress = levelProgressFor(150);
    expect(progress.level).toBe(2);
    expect(progress.xpIntoLevel).toBe(50);
    expect(progress.xpToNextLevel).toBe(150);
    expect(progress.levelProgress).toBeCloseTo(1 / 3);
  });

  it("is empty at level 1", () => {
    const progress = levelProgressFor(0);
    expect(progress.level).toBe(1);
    expect(progress.xpIntoLevel).toBe(0);
    expect(progress.levelProgress).toBe(0);
  });
});

describe("evaluateAchievements", () => {
  it("locks everything for an empty profile", () => {
    const achievements = evaluateAchievements(emptyStats);
    expect(achievements.every((achievement) => !achievement.unlocked)).toBe(true);
  });

  it("unlocks a badge as soon as its criterion is met", () => {
    const achievements = evaluateAchievements(stats({ ratedCount: 1 }));
    const firstReview = achievements.find((a) => a.id === "first-review");
    expect(firstReview?.unlocked).toBe(true);
  });

  it("clamps the reported progress to the target", () => {
    const achievements = evaluateAchievements(stats({ ratedCount: 40 }));
    const reviewer = achievements.find((a) => a.id === "reviewer");
    expect(reviewer?.current).toBe(10);
    expect(reviewer?.target).toBe(10);
  });

  it("keeps a badge unlocked when it is in the ratchet", () => {
    const achievements = evaluateAchievements(emptyStats, ["curator"]);
    const curator = achievements.find((a) => a.id === "curator");
    expect(curator?.unlocked).toBe(true);
  });

  it("never depends on the level or on XP", () => {
    for (const achievement of ACHIEVEMENTS) {
      expect(achievement.metric).not.toBe("level");
      expect(["ratedCount", "fiveStarCount", "playedCount", "trackedCount", "playtimeHours"]).toContain(
        achievement.metric,
      );
    }
  });
});

describe("computeGamification", () => {
  it("gives a new user nothing", () => {
    const state = computeGamification(emptyStats);
    expect(state.totalXp).toBe(0);
    expect(state.level).toBe(1);
    expect(state.breakdown).toEqual([]);
  });

  it("sums every activity source", () => {
    const state = computeGamification(
      stats({ ratedCount: 10, fiveStarCount: 2, playedCount: 3, trackedCount: 20 }),
    );
    expect(state.breakdown).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ reason: "first_rating", amount: XP_REWARDS.first_rating * 10 }),
        expect.objectContaining({
          reason: "five_star_rating",
          amount: XP_REWARDS.five_star_rating * 2,
        }),
        expect.objectContaining({ reason: "game_played", amount: XP_REWARDS.game_played * 3 }),
        expect.objectContaining({ reason: "game_tracked", amount: XP_REWARDS.game_tracked * 20 }),
      ]),
    );
  });

  it("grants an achievement bonus once it unlocks", () => {
    const withoutBadge = computeGamification(stats({ ratedCount: 1 }));
    const withBadge = computeGamification(stats({ ratedCount: 1 }));
    expect(withBadge.calculatedXp).toBe(withoutBadge.calculatedXp);
    const achievementLine = withBadge.breakdown.find((entry) => entry.reason === "achievement");
    expect(achievementLine?.amount).toBeGreaterThan(0);
  });

  it("never lets XP or the level drop below the high-water mark", () => {
    const rich = stats({ ratedCount: 40, trackedCount: 40 });
    const banked = computeGamification(rich).totalXp;
    const poorer = computeGamification(stats({ ratedCount: 1 }), { bankedXp: banked });
    expect(poorer.totalXp).toBe(banked);
    expect(poorer.level).toBe(levelForXp(banked));
  });

  it("reports retained XP as its own breakdown line", () => {
    const state = computeGamification(stats({ ratedCount: 1 }), { bankedXp: 500 });
    const retained = state.breakdown.find((entry) => entry.reason === "retained");
    expect(retained).toBeDefined();
    const sum = state.breakdown.reduce((total, entry) => total + entry.amount, 0);
    expect(sum).toBe(state.totalXp);
  });

  it("keeps the breakdown adding up to the displayed total", () => {
    const state = computeGamification(stats({ ratedCount: 12, fiveStarCount: 3, playedCount: 4 }));
    const sum = state.breakdown.reduce((total, entry) => total + entry.amount, 0);
    expect(sum).toBe(state.totalXp);
  });
});

describe("foldGamification", () => {
  it("starts from nothing for a new user", () => {
    const folded = foldGamification(0, [], emptyStats);
    expect(folded.totalXp).toBe(0);
    expect(folded.gained).toBe(0);
    expect(folded.level).toBe(1);
    expect(folded.unlockedAchievementIds).toEqual([]);
  });

  it("grants the XP the counters justify", () => {
    // Two ratings (2 × 50 XP) plus the "first review" badge (25 XP).
    const folded = foldGamification(0, [], stats({ ratedCount: 2 }));
    expect(folded.totalXp).toBe(XP_REWARDS.first_rating * 2 + ACHIEVEMENTS[0]!.xp);
    expect(folded.gained).toBe(folded.totalXp);
  });

  it("never lets XP drop below the high-water mark", () => {
    const folded = foldGamification(1000, ["curator"], stats({ ratedCount: 1 }));
    expect(folded.totalXp).toBe(1000);
    expect(folded.gained).toBe(0);
    expect(folded.level).toBe(levelForXp(1000));
  });

  it("never takes a badge back", () => {
    const folded = foldGamification(0, ["critic"], emptyStats);
    expect(folded.unlockedAchievementIds).toContain("critic");
  });

  it("never counts a local award twice", () => {
    // The optimistic award path banked 60 XP for three tracked games; the
    // authoritative derivation now sees the same three games. The ratchet
    // takes the maximum, so they are worth 60 XP — not 120.
    const folded = foldGamification(60, [], stats({ trackedCount: 3 }));
    expect(folded.totalXp).toBe(60);
    expect(folded.gained).toBe(0);
  });

  it("adds the badge bonus on top of the activity XP", () => {
    const folded = foldGamification(0, [], stats({ ratedCount: 1 }));
    // 50 XP for the rating plus 25 XP for the "first review" badge.
    expect(folded.totalXp).toBe(
      XP_REWARDS.first_rating + ACHIEVEMENTS[0]!.xp,
    );
    expect(folded.unlockedAchievementIds).toContain("first-review");
  });

  it("keeps the badge bonus when the badge was already unlocked", () => {
    const first = foldGamification(0, [], stats({ ratedCount: 1 }));
    const second = foldGamification(first.totalXp, first.unlockedAchievementIds, stats({ ratedCount: 1 }));
    expect(second.totalXp).toBe(first.totalXp);
    expect(second.gained).toBe(0);
  });

  it("reports a negative gain as zero", () => {
    const folded = foldGamification(500, [], stats({ ratedCount: 1 }));
    expect(folded.gained).toBe(0);
  });

  it("survives a counter that is not a number", () => {
    // A cache written before a counter existed has no value for it. Left
    // alone that is `undefined`, and `undefined * 50` is `NaN` — which would
    // then stick to the high-water mark, because `Math.max(NaN, x)` is `NaN`.
    const broken = {
      ratedCount: 2,
      fiveStarCount: undefined,
      playedCount: undefined,
      trackedCount: undefined,
      playtimeHours: undefined,
    } as unknown as GamificationStats;

    const folded = foldGamification(0, [], broken);
    expect(folded.totalXp).toBe(XP_REWARDS.first_rating * 2 + ACHIEVEMENTS[0]!.xp);
    expect(Number.isNaN(folded.totalXp)).toBe(false);
  });

  it("survives a high-water mark that is not a number", () => {
    const folded = foldGamification(Number.NaN, [], stats({ ratedCount: 1 }));
    expect(Number.isNaN(folded.totalXp)).toBe(false);
    expect(folded.totalXp).toBe(XP_REWARDS.first_rating + ACHIEVEMENTS[0]!.xp);
    expect(folded.gained).toBe(folded.totalXp);
  });
});
