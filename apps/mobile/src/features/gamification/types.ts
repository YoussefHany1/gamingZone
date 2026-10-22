/**
 * Prop types for the gamification component family.
 *
 * They live next to the components so `features/gamification/types.ts` (the
 * data models and the hooks) does not balloon with component-only shapes.
 */
import type { AchievementState, GamificationState } from "@gaming-zone/core";

export type LevelCardProps = {
  /** The derived gamification state, or null while the counters load. */
  gamification: GamificationState | null;
  /** How many badges the user has unlocked. */
  unlockedCount: number;
  /** Opens the achievements screen. Omitted when the card is read-only. */
  onPress?: () => void;
};

export type AchievementTileProps = {
  achievement: AchievementState;
};

export type AchievementGridProps = {
  achievements: AchievementState[];
};

export type LevelUpOverlayProps = {
  /** The level reached, or null when there is nothing to celebrate. */
  levelUp: { id: number; fromLevel: number; toLevel: number } | null;
  onDismiss: () => void;
};

export type XpToastProps = {
  /** The pending toast, or null when there is nothing to show. */
  toast: {
    id: number;
    amount: number;
    labelKey: string;
    createdAt: number;
  } | null;
  onDismiss: () => void;
};
