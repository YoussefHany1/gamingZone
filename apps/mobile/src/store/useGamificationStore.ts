/**
 * The gamification store: XP, level and badges for a user.
 *
 * Two properties drive the design:
 *
 *   1. **Nothing ever goes down.** XP and unlocked badges are high-water
 *      marks. Removing a game from a list lowers the counters the XP is
 *      derived from, but it can never take XP, a level or a badge away — the
 *      user is not penalised for tidying up their library.
 *   2. **Two write paths, one number.** An award can be granted locally the
 *      moment the action happens (so the "+50 XP" feedback is instant), and
 *      the authoritative derivation can grant more later. The two never
 *      double-count, because the authoritative path takes the *maximum* of
 *      the two rather than their sum.
 *
 * The persisted part is deliberately small: the XP high-water mark and the
 * ids of the badges that have been unlocked. Everything else is derived.
 */
import { create } from "zustand";
import type { GamificationStats, XpReason } from "@gaming-zone/core";
import { foldGamification, levelForXp } from "@gaming-zone/utils";
import { storageGet, storageSet } from "@/src/lib/storage";

/** A pending "+N XP" toast. */
export interface XpToast {
  id: number;
  amount: number;
  labelKey: string;
  /** When the toast was raised, so a later award can be merged into it. */
  createdAt: number;
}

/** A pending level-up celebration. */
export interface LevelUpEvent {
  id: number;
  fromLevel: number;
  toLevel: number;
}

interface PersistedGamification {
  /** The XP high-water mark. */
  totalXp: number;
  /** Badge ids that have been unlocked at some point. */
  unlockedAchievementIds: string[];
  /** Keys of the actions that have already been paid for. */
  awardedKeys: string[];
}

interface GamificationEntry {
  /** The XP high-water mark. */
  totalXp: number;
  /** Badge ids that have been unlocked at some point. */
  unlockedAchievementIds: string[];
  /**
   * Keys of the actions that have already been paid for.
   *
   * The derived XP cannot catch these on its own: clearing a rating deletes
   * the rating document, so the counters go back to "never rated" and the
   * derivation would happily pay for the rating a second time. The key is
   * what makes an award happen at most once.
   */
  awardedKeys: string[];
  /** The XP the live counters currently account for. */
  calculatedXp: number;
  /** The highest level reached so far. */
  level: number;
  /** True once the authoritative derivation has run at least once. */
  synced: boolean;
  toast: XpToast | null;
  levelUp: LevelUpEvent | null;
}

/**
 * The store's own shape.
 *
 * It is deliberately *not* called `GamificationState`: that name belongs to
 * the derived model in `@gaming-zone/core`, and the app keeps one copy of
 * every shared model.
 */
interface GamificationStoreState {
  byUid: Record<string, GamificationEntry>;

  /**
   * Grants XP locally, e.g. right after the user rated a game.
   *
   * This only raises the high-water mark and shows the "+N XP" toast. It
   * deliberately does *not* raise a level-up: until the first authoritative
   * sync the store does not know the user's real level, and celebrating a
   * level the user has not reached is worse than celebrating it late.
   *
   * `key` identifies the action that is being paid for. An action that has
   * already been paid for is not paid for again, which is what keeps a
   * cleared-and-entered rating from paying twice.
   */
  award: (
    uid: string,
    amount: number,
    labelKey: string,
    key?: string,
  ) => void;

  /**
   * Folds the authoritative derivation into the ratchet: XP becomes the
   * maximum of what was banked and what the counters now justify, and badges
   * that are newly satisfied are unlocked.
   */
  sync: (uid: string, stats: GamificationStats) => void;

  dismissToast: (uid: string) => void;
  dismissLevelUp: (uid: string) => void;
}

const EMPTY_ENTRY: GamificationEntry = {
  totalXp: 0,
  unlockedAchievementIds: [],
  awardedKeys: [],
  calculatedXp: 0,
  level: 1,
  synced: false,
  toast: null,
  levelUp: null,
};

const persistenceKey = (uid: string): string => `GAMIFICATION_${uid}`;

/**
 * How long a toast may stay on screen and still absorb a later award.
 *
 * The toast is dismissed after a little over two seconds, so anything older
 * than this is gone and a new one should be raised instead.
 */
const TOAST_MERGE_MS = 3000;

let toastId = 0;
let levelUpId = 0;

function readPersisted(uid: string): PersistedGamification {
  const stored = storageGet<PersistedGamification>(persistenceKey(uid));
  const totalXp =
    typeof stored?.totalXp === "number" && stored.totalXp > 0 ? stored.totalXp : 0;
  return {
    totalXp,
    unlockedAchievementIds: Array.isArray(stored?.unlockedAchievementIds)
      ? stored.unlockedAchievementIds.filter(
          (id): id is string => typeof id === "string",
        )
      : [],
    awardedKeys: Array.isArray(stored?.awardedKeys)
      ? stored.awardedKeys.filter(
          (key): key is string => typeof key === "string",
        )
      : [],
  };
}

/** The entry for a user, seeded from the persisted ratchet when unseen. */
function entryFor(uid: string, existing?: GamificationEntry): GamificationEntry {
  if (existing) {
    // A total that is not a finite number would make every later fold
    // produce `NaN`, because `Math.max(NaN, x)` is `NaN`.
    if (Number.isFinite(existing.totalXp)) return existing;
    return {
      ...existing,
      totalXp: 0,
      calculatedXp: 0,
      level: levelForXp(0),
    };
  }
  const persisted = readPersisted(uid);
  return {
    ...EMPTY_ENTRY,
    totalXp: persisted.totalXp,
    unlockedAchievementIds: persisted.unlockedAchievementIds,
    awardedKeys: persisted.awardedKeys,
    level: levelForXp(persisted.totalXp),
  };
}

function persist(uid: string, entry: GamificationEntry): void {
  storageSet(persistenceKey(uid), {
    totalXp: entry.totalXp,
    unlockedAchievementIds: entry.unlockedAchievementIds,
    awardedKeys: entry.awardedKeys,
  });
}

/** Whether two badge id lists hold the same ids. */
function sameIds(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export const useGamificationStore = create<GamificationStoreState>()((set) => ({
  byUid: {},

  award: (uid, amount, labelKey, key) => {
    if (!uid || !Number.isFinite(amount) || amount <= 0) return;

    set((state) => {
      const current = entryFor(uid, state.byUid[uid]);

      // An action is paid for at most once. Without this, clearing a rating
      // and entering it again would pay for the same rating twice, because
      // clearing deletes the rating document and the counters go back to
      // "never rated".
      if (key !== undefined && current.awardedKeys.includes(key)) {
        return state;
      }

      const totalXp = current.totalXp + amount;
      const awardedKeys =
        key === undefined
          ? current.awardedKeys
          : [...current.awardedKeys, key];

      const next: GamificationEntry = {
        ...current,
        totalXp,
        awardedKeys,
        level: Math.max(current.level, levelForXp(totalXp)),
        toast: { id: (toastId += 1), amount, labelKey, createdAt: Date.now() },
      };
      persist(uid, next);
      return { byUid: { ...state.byUid, [uid]: next } };
    });
  },

  sync: (uid, stats) => {
    if (!uid) return;

    set((state) => {
      const existing = state.byUid[uid];
      const current = entryFor(uid, existing);

      // The rule lives in the shared package, so the client and a future
      // server implementation fold the ratchet the exact same way.
      const folded = foldGamification(
        current.totalXp,
        current.unlockedAchievementIds,
        stats,
      );

      // The authoritative path may grant XP the local award path missed (a
      // badge that unlocked, or a list change made elsewhere). Because the
      // ratchet takes the maximum rather than the sum, this can only ever be
      // XP that was genuinely earned — never a double count.
      const gained = folded.gained;

      // A toast that is still on screen absorbs the authoritative gain, so
      // the user sees one number instead of two toasts racing each other.
      let toast = current.toast;
      if (gained > 0) {
        const pending = current.toast;
        const isFresh =
          pending !== null && Date.now() - pending.createdAt < TOAST_MERGE_MS;
        const base = isFresh ? pending : null;
        toast = {
          id: (toastId += 1),
          amount: base ? base.amount + gained : gained,
          labelKey: base ? base.labelKey : "gamification.xpEarned.generic",
          createdAt: Date.now(),
        };
      }

      const next: GamificationEntry = {
        ...current,
        totalXp: folded.totalXp,
        unlockedAchievementIds: folded.unlockedAchievementIds,
        calculatedXp: folded.calculatedXp,
        level: Math.max(current.level, folded.level),
        synced: true,
        toast,
        // The first sync only establishes the baseline — it is an
        // initialisation, not something the user just earned.
        levelUp:
          current.synced && folded.level > current.level
            ? {
                id: (levelUpId += 1),
                fromLevel: current.level,
                toLevel: folded.level,
              }
            : current.levelUp,
      };

      // Nothing moved: leave the state object alone so subscribers are not
      // woken for a no-op. A user that has never been seen always gets an
      // entry, because that is what records the baseline.
      if (
        existing &&
        next.totalXp === existing.totalXp &&
        next.calculatedXp === existing.calculatedXp &&
        next.level === existing.level &&
        next.synced === existing.synced &&
        next.toast === existing.toast &&
        next.levelUp === existing.levelUp &&
        sameIds(next.unlockedAchievementIds, existing.unlockedAchievementIds)
      ) {
        return state;
      }

      if (
        next.totalXp !== current.totalXp ||
        next.unlockedAchievementIds.length !== current.unlockedAchievementIds.length
      ) {
        persist(uid, next);
      }
      return { byUid: { ...state.byUid, [uid]: next } };
    });
  },

  dismissToast: (uid) => {
    set((state) => {
      const current = state.byUid[uid];
      if (!current?.toast) return state;
      return {
        byUid: {
          ...state.byUid,
          [uid]: { ...current, toast: null },
        },
      };
    });
  },

  dismissLevelUp: (uid) => {
    set((state) => {
      const current = state.byUid[uid];
      if (!current?.levelUp) return state;
      return {
        byUid: {
          ...state.byUid,
          [uid]: { ...current, levelUp: null },
        },
      };
    });
  },
}));

/** i18n key for an XP source, used by the toast when XP is granted. */
export const XP_TOAST_LABEL_KEYS: Record<XpReason, string> = {
  first_rating: "gamification.xpEarned.firstRating",
  five_star_rating: "gamification.xpEarned.fiveStar",
  game_played: "gamification.xpEarned.gamePlayed",
  game_tracked: "gamification.xpEarned.gameTracked",
};
