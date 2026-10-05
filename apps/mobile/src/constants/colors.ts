/**
 * colors.ts — the single source of truth for the app's color palettes.
 *
 * Two palettes are defined here (dark and light) behind one shared
 * `ThemeColors` shape. Components never import a palette directly; they read
 * the active one through `useThemeColors()` / `useThemeStyles()` so that a
 * theme change re-renders them.
 *
 * Conventions:
 *  - Tokens are named by *role*, not by appearance. The previous
 *    appearance-named tokens (`light`, `dark`, `lightGray`) could not be
 *    inverted because the same value served as a background in one place and
 *    a text color in another.
 *  - Values that are alpha-modulated at the call site (e.g. `accent + "33"`)
 *    MUST be 6-digit hex. Prefer the pre-mixed translucent tokens
 *    (`accentSurface`, `accentBorder`, `overlay`) where one of them fits —
 *    an alpha of a *light* value on a light background is invisible, so
 *    deriving translucency from a theme-swapped base color is unsafe.
 *  - Objects are frozen and module-level so their identity is stable, which
 *    lets `useThemeColors()` results be used directly as memo dependencies.
 */

export type ThemeMode = "system" | "light" | "dark";

/** Resolved (non-"system") schemes, i.e. what a palette is keyed by. */
export type ColorScheme = "light" | "dark";

export interface ThemeColors {
  //  Surfaces
  /** Screen background. */
  background: string;
  /** Deep/gradient end stop, modal headers, tab bar. */
  backgroundDeep: string;
  /**
   * Scrim for text laid over photography or video. Cards render their art
   * edge-to-edge, so legibility of an overlaid caption depends on the image,
   * not the theme — this stays a fixed dark overlay in both schemes.
   */
  scrim: string;
  /** Gradient mid-stop: a partially transparent scrim. */
  scrimSoft: string;
  /** Gradient end-stop: the opaque end of a scrim. */
  scrimSolid: string;
  /** Raised surfaces: cards, menu rows, list items. */
  surface: string;
  /** Translucent surface tint derived from the accent. */
  accentSurface: string;

  //  Text
  /** Primary text. */
  text: string;
  /** Secondary text, supporting icons. */
  textMuted: string;
  /** Placeholder / disabled text. */
  textSubtle: string;
  /** Text placed on top of `accent` fills. */
  onAccent: string;

  //  Accent
  /** Accent fills: buttons, tab indicator, selected states. */
  accent: string;
  /** Accent used for text, icons and borders. */
  accentText: string;
  /** Translucent accent border. */
  accentBorder: string;

  //  Lines & overlays
  /** Hairline separators, input borders. */
  border: string;
  /** Zebra-striping fill for dense tables and lists. */
  stripe: string;
  /** Modal / image backdrop scrim. */
  overlay: string;

  //  Status
  danger: string;
  /** Skeleton shimmer base. */
  skeletonBase: string;
  /** Skeleton shimmer highlight. */
  skeletonHighlight: string;
}

export const DARK_COLORS: ThemeColors = Object.freeze({
  background: "#0c1a33",
  backgroundDeep: "#00001c",
  scrim: "rgba(12, 26, 51, 0.65)",
  scrimSoft: "rgba(12, 26, 51, 0.4)",
  scrimSolid: "rgba(12, 26, 51, 0.95)",
  surface: "rgba(119, 155, 221, 0.2)",
  accentSurface: "rgba(81, 105, 150, 0.3)",

  text: "#ffffff",
  textMuted: "#779bdd",
  textSubtle: "#aaaaaa",
  onAccent: "#ffffff",

  accent: "#516996",
  accentText: "#779bdd",
  accentBorder: "rgba(119, 155, 221, 0.4)",

  border: "rgba(119, 155, 221, 0.25)",
  stripe: "rgba(119, 155, 221, 0.1)",
  overlay: "rgba(0, 0, 0, 0.6)",

  danger: "#ff3b30",
  skeletonBase: "#1f3a60",
  skeletonHighlight: "#2a4a75",
});

export const LIGHT_COLORS: ThemeColors = Object.freeze({
  background: "#f2f5fb",
  backgroundDeep: "#dbe4f2",
  // Scrims stay dark in light mode on purpose — see the ThemeColors note.
  scrim: "rgba(12, 26, 51, 0.65)",
  scrimSoft: "rgba(12, 26, 51, 0.4)",
  scrimSolid: "rgba(12, 26, 51, 0.95)",
  surface: "rgba(12, 26, 51, 0.05)",
  accentSurface: "rgba(12, 26, 51, 0.08)",

  text: "#0c1a33",
  textMuted: "#4a5b7a",
  textSubtle: "#8a94a6",
  onAccent: "#ffffff",

  // A dark navy keeps accent fills legible and — critically — keeps any
  // alpha derived from it (accent + "33") visible on a light background.
  accent: "#0c1a33",
  accentText: "#0c1a33",
  accentBorder: "rgba(12, 26, 51, 0.2)",

  border: "rgba(12, 26, 51, 0.12)",
  // Zebra-striping for dense tables. An alpha tuned for the dark background
  // is nearly invisible once inverted, so each scheme gets its own value.
  stripe: "rgba(81, 105, 150, 0.06)",
  overlay: "rgba(12, 26, 51, 0.45)",

  danger: "#d92d20",
  skeletonBase: "#dfe6f2",
  skeletonHighlight: "#eef2f9",
});

export const THEME_COLORS: Record<ColorScheme, ThemeColors> = Object.freeze({
  dark: DARK_COLORS,
  light: LIGHT_COLORS,
});

/** The palette used before a preference is set and while fonts load. */
export const DEFAULT_COLORS = DARK_COLORS;

export type ColorKey = keyof ThemeColors;
export type ColorValue = ThemeColors[ColorKey];
