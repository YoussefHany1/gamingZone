/**
 * Barrel export for the `gamification` feature.
 *
 * @example
 * import { AchievementsScreen, useGamification } from '@/src/features/gamification';
 */

// ── Screens ───────────────────────────────────────────────────────────────────
export { default as AchievementsScreen } from "./screens/AchievementsScreen";

// ── Hooks ─────────────────────────────────────────────────────────────────────
export { useGamification } from "./hooks/useGamification";

// ── Components ────────────────────────────────────────────────────────────────
export { default as LevelCard } from "./components/LevelCard";
export { default as XpProgressBar } from "./components/XpProgressBar";
export { default as AchievementGrid } from "./components/AchievementGrid";
export { default as AchievementTile } from "./components/AchievementTile";
export { default as LevelUpOverlay } from "./components/LevelUpOverlay";
export { default as XpToast } from "./components/XpToast";
export { default as GamificationOverlay } from "./components/GamificationOverlay";

// ── Types ─────────────────────────────────────────────────────────────────────
export type {
  LevelCardProps,
  AchievementTileProps,
  AchievementGridProps,
  LevelUpOverlayProps,
  XpToastProps,
} from "./types";
