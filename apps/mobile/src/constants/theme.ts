/**
 * theme.ts — composition of the app's three appearance axes.
 *
 * The active palette is derived, never authored per combination:
 *
 *   scheme  — the brightness axis (System / Light / Dark), resolved by
 *             `useThemeStore` to "light" or "dark"
 *   style   — a hand-authored partial override of that scheme's base palette
 *             (`STYLES`), so a style only declares the tokens it changes
 *   accent  — a hue applied on top as a token transform (`ACCENTS`)
 *
 * Authoring styles as *overrides* rather than full palettes means `default`
 * contributes `{}` and therefore reproduces the app's existing look exactly.
 *
 * Resolved palettes are frozen and cached, so their object identity is stable
 * between renders. That is what lets `useThemeStyles` memoize on the palette
 * reference, and what lets callers compare palettes by identity.
 *
 * Invariants asserted by `scripts/check-theme.ts` (see ASSERTION comments):
 *  - ASSERTION A — `TEXT_MUTED_TINTED` documents whether the base palette's
 *    `textMuted` is really its accent-derived hue, per scheme.
 *  - ASSERTION B — a style that overrides `textMuted` must also declare
 *    `tintTextMuted` explicitly, so the two can never silently disagree.
 */

import { BASE_PALETTES, type ColorScheme, type ThemeColors } from "./colors";
import {
  contrastRatio,
  formatColor,
  hslToRgb,
  over,
  parseColor,
  readableForeground,
  rgbToHsl,
  withRgb,
} from "./colorUtils";

/** Palette variants. See `STYLES` below. */
export type ThemeStyle =
  | "default"
  | "amoled"
  | "sepia"
  | "contrast"
  | "steam"
  | "blurple"
  | "nintendo"
  | "playstation"
  | "xbox";

/** Accent choices. `random` is resolved once per app launch by the store. */
export type AccentId =
  "auto" | "random" | "blue" | "green" | "purple" | "orange" | "pink" | "gold" | "slate";

/** Accent ids that name an actual color — what the resolver accepts. */
export type ConcreteAccentId = Exclude<AccentId, "auto" | "random">;

/**
 * A style's contribution to the palette.
 *
 * The two `tint*` flags are configuration, not palette entries: they are
 * stripped before the object is frozen, so a resolved palette has exactly
 * `keyof ThemeColors` and nothing else.
 */
export interface StyleOverride extends Partial<ThemeColors> {
  /**
   * Whether `surface`, `border` and `stripe` take the chosen accent's hue.
   *
   * Those three are expressed as translucent accent in the base palettes, so
   * leaving them untinted would pair, say, a green accent with blue borders.
   * Defaults to `true`.
   */
  tintSurface?: boolean;
  /**
   * Whether `textMuted` follows the accent. Defaults to
   * `TEXT_MUTED_TINTED[scheme]`.
   */
  tintTextMuted?: boolean;
}

/**
 * ASSERTION A — whether each base palette's `textMuted` *is* its accent hue,
 * making it correct to retint it with the accent.
 *
 * `dark` qualifies (`#779bdd` is both `textMuted` and `accentText`); `light`
 * does not (`#4a5b7a` is a deliberate neutral slate, not accent-derived), so
 * retinting it would wash the secondary text toward the accent hue.
 *
 * If `colors.ts` ever changes this relationship, `check-theme.ts` fails and
 * this table must be revisited deliberately.
 */
export const TEXT_MUTED_TINTED: Record<ColorScheme, boolean> = Object.freeze({
  dark: true,
  light: false,
});

/**
 * Accent fills. These are used verbatim for `accent`; `accentText` and the
 * translucent tokens are derived from them so that hue stays consistent.
 *
 * Contrast is verified across every style/scheme combination by
 * `check-theme.ts`, not judged by eye here.
 */
export const ACCENTS: Record<ConcreteAccentId, string> = Object.freeze({
  blue: "#516996",
  green: "#2f7d5a",
  purple: "#6b5ce7",
  orange: "#c2621f",
  pink: "#c2447a",
  gold: "#a67c00",
  slate: "#5a6478",
});

const EMPTY_OVERRIDE: StyleOverride = Object.freeze({});

/**
 * Per-style palette overrides. Only the tokens that differ from the base
 * palette are declared; anything omitted inherits from `BASE_PALETTES`.
 *
 * Every style is keyed under both schemes, but each only overrides the
 * brightness it pins in `STYLE_SCHEME`; the other scheme stays `EMPTY_OVERRIDE`
 * and inherits the untouched base palette. So AMOLED pins dark (pure black),
 * Sepia/Contrast/Nintendo/PlayStation pin light, and Steam/Blurple/Xbox pin
 * dark — no fallback logic is needed.
 */
export const STYLES: Record<
  ThemeStyle,
  Record<ColorScheme, StyleOverride>
> = Object.freeze({
  default: { light: EMPTY_OVERRIDE, dark: EMPTY_OVERRIDE },

  amoled: {
    light: EMPTY_OVERRIDE,
    dark: {
      background: "#000000",
      backgroundDeep: "#000000",
      surface: "rgba(255, 255, 255, 0.07)",
      scrim: "rgba(0, 0, 0, 0.65)",
      scrimSoft: "rgba(0, 0, 0, 0.4)",
      scrimSolid: "rgba(0, 0, 0, 0.95)",
      skeletonBase: "#1c1c1c",
      skeletonHighlight: "#2a2a2a",
    },
  },

  sepia: {
    light: {
      background: "#f6efe2",
      backgroundDeep: "#e9dcc3",
      surface: "rgba(90, 64, 32, 0.06)",
      accentSurface: "rgba(90, 64, 32, 0.1)",
      text: "#3a2e1d",
      textMuted: "#6b5a41",
      textSubtle: "#948470",
      accent: "#4a3722",
      accentText: "#5c4529",
      accentBorder: "rgba(92, 69, 41, 0.25)",
      border: "rgba(58, 46, 29, 0.14)",
      stripe: "rgba(92, 69, 41, 0.07)",
      overlay: "rgba(58, 46, 29, 0.45)",
      danger: "#b3261e",
      skeletonBase: "#e6dcc6",
      skeletonHighlight: "#f1e9da",
      tintTextMuted: false,
    },
    dark: EMPTY_OVERRIDE,
  },

  // Accessibility-oriented: neutral surfaces, near-maximal text contrast, and
  // borders heavy enough to define controls without relying on fill color.
  contrast: {
    light: {
      tintSurface: false,
      background: "#ffffff",
      backgroundDeep: "#e6e6e6",
      surface: "rgba(0, 0, 0, 0.06)",
      accentSurface: "rgba(0, 51, 204, 0.14)",
      text: "#000000",
      textMuted: "#333333",
      textSubtle: "#5c5c5c",
      accent: "#0033cc",
      accentText: "#00279e",
      accentBorder: "rgba(0, 39, 158, 0.5)",
      border: "rgba(0, 0, 0, 0.45)",
      stripe: "rgba(0, 0, 0, 0.1)",
      overlay: "rgba(0, 0, 0, 0.55)",
      skeletonBase: "#dedede",
      skeletonHighlight: "#f0f0f0",
      tintTextMuted: false,
    },
    dark: {
      tintSurface: false,
      background: "#000000",
      backgroundDeep: "#000000",
      surface: "rgba(255, 255, 255, 0.15)",
      accentSurface: "rgba(122, 162, 255, 0.26)",
      scrim: "rgba(0, 0, 0, 0.7)",
      scrimSoft: "rgba(0, 0, 0, 0.45)",
      scrimSolid: "rgba(0, 0, 0, 0.95)",
      text: "#ffffff",
      textMuted: "#e8e8e8",
      textSubtle: "#c4c4c4",
      accent: "#7aa2ff",
      accentText: "#aecbff",
      accentBorder: "rgba(174, 203, 255, 0.6)",
      border: "rgba(255, 255, 255, 0.45)",
      stripe: "rgba(255, 255, 255, 0.16)",
      overlay: "rgba(0, 0, 0, 0.7)",
      skeletonBase: "#262626",
      skeletonHighlight: "#404040",
      tintTextMuted: false,
    },
  },

  steam: {
    light: EMPTY_OVERRIDE,
    dark: {
      background: "#1f2a35",
      backgroundDeep: "#171d25",
      surface: "rgba(102, 192, 244, 0.1)",
      accentSurface: "rgba(66, 139, 202, 0.3)",
      scrim: "rgba(14, 22, 33, 0.65)",
      scrimSoft: "rgba(14, 22, 33, 0.4)",
      scrimSolid: "rgba(14, 22, 33, 0.95)",
      text: "#dcdedf",
      textMuted: "#9dc4dc",
      textSubtle: "#a6adb5",
      accent: "#417a9b",
      accentText: "#66c0f4",
      accentBorder: "rgba(102, 192, 244, 0.35)",
      border: "rgba(102, 192, 244, 0.22)",
      stripe: "rgba(102, 192, 244, 0.08)",
      overlay: "rgba(0, 0, 0, 0.6)",
      danger: "#ff3b30",
      skeletonBase: "#1b2838",
      skeletonHighlight: "#2b4a63",
      tintTextMuted: false,
    },
  },

  blurple: {
    light: EMPTY_OVERRIDE,
    dark: {
      background: "#12141f",
      backgroundDeep: "#0a0b13",
      surface: "rgba(139, 147, 245, 0.11)",
      accentSurface: "rgba(88, 101, 242, 0.26)",
      scrim: "rgba(18, 20, 31, 0.65)",
      scrimSoft: "rgba(18, 20, 31, 0.4)",
      scrimSolid: "rgba(18, 20, 31, 0.95)",
      text: "#ffffff",
      textMuted: "#a3a9dd",
      textSubtle: "#a9adbb",
      accent: "#5865f2",
      accentText: "#8b93f5",
      accentBorder: "rgba(139, 147, 245, 0.35)",
      border: "rgba(139, 147, 245, 0.2)",
      stripe: "rgba(139, 147, 245, 0.08)",
      overlay: "rgba(0, 0, 0, 0.6)",
      danger: "#ff3b30",
      skeletonBase: "#1e2233",
      skeletonHighlight: "#2c3149",
      tintTextMuted: false,
    },
  },

  nintendo: {
    light: {
      background: "#f9f2f2",
      backgroundDeep: "#f6ebec",
      surface: "rgba(230, 0, 18, 0.06)",
      accentSurface: "rgba(230, 0, 18, 0.1)",
      text: "#484848",
      textMuted: "#6e4048",
      textSubtle: "#a3838a",
      accent: "#e60012",
      accentText: "#8d0f1c",
      accentBorder: "rgba(141, 15, 28, 0.28)",
      scrim: "rgba(31, 12, 16, 0.65)",
      scrimSoft: "rgba(31, 12, 16, 0.4)",
      scrimSolid: "rgba(31, 12, 16, 0.95)",
      border: "rgba(31, 12, 16, 0.14)",
      stripe: "rgba(230, 0, 18, 0.07)",
      overlay: "rgba(31, 12, 16, 0.45)",
      danger: "#c0261f",
      skeletonBase: "#f3e2e5",
      skeletonHighlight: "#fcf1f2",
      tintTextMuted: false,
    },
    dark: EMPTY_OVERRIDE,
  },

  playstation: {
    light: {
      background: "#f4f8ff",
      backgroundDeep: "#dfe9fb",
      surface: "rgba(0, 112, 209, 0.08)",
      accentSurface: "rgba(0, 112, 209, 0.12)",
      text: "#0b1630",
      textMuted: "#3f5d8f",
      textSubtle: "#6f819f",
      accent: "#0070d1",
      accentText: "#0a58c0",
      accentBorder: "rgba(10, 88, 192, 0.25)",
      border: "rgba(11, 22, 48, 0.14)",
      stripe: "rgba(10, 88, 192, 0.07)",
      overlay: "rgba(11, 22, 48, 0.45)",
      danger: "#d92d20",
      skeletonBase: "#dfe9fb",
      skeletonHighlight: "#eef5fe",
      tintTextMuted: false,
    },
    dark: EMPTY_OVERRIDE,
  },

  xbox: {
    light: EMPTY_OVERRIDE,
    dark: {
      background: "#0b0f0b",
      backgroundDeep: "#050705",
      surface: "rgba(101, 212, 106, 0.1)",
      accentSurface: "rgba(16, 124, 16, 0.34)",
      scrim: "rgba(7, 10, 7, 0.65)",
      scrimSoft: "rgba(7, 10, 7, 0.4)",
      scrimSolid: "rgba(5, 7, 5, 0.95)",
      text: "#f2f7f1",
      textMuted: "#9fc79b",
      textSubtle: "#7f967c",
      accent: "#107c10",
      accentText: "#65d46a",
      accentBorder: "rgba(101, 212, 106, 0.4)",
      border: "rgba(101, 212, 106, 0.24)",
      stripe: "rgba(101, 212, 106, 0.08)",
      overlay: "rgba(0, 0, 0, 0.6)",
      danger: "#ff3b30",
      skeletonBase: "#1d2f1b",
      skeletonHighlight: "#2b4229",
      tintTextMuted: false,
    },
  },
});

export const THEME_STYLES: readonly ThemeStyle[] = Object.freeze(
  Object.keys(STYLES) as ThemeStyle[],
);

/**
 * The single-select appearance list.
 *
 * An appearance is a *complete* look, not one axis of one: picking "Steam Blue"
 * brings its background, surfaces, text and accent with it, exactly as picking
 * "Dark" does. That is why styles carry their own brightness (see
 * `STYLE_SCHEME`) instead of borrowing whatever brightness was set before.
 *
 * `default` is deliberately absent — it is the style behind System/Light/Dark,
 * so it has no row of its own.
 */
export const APPEARANCE_IDS = [
  "system",
  "light",
  "dark",
  "amoled",
  "sepia",
  "contrast",
  "steam",
  "blurple",
  "nintendo",
  "playstation",
  "xbox",
] as const;

export type Appearance = (typeof APPEARANCE_IDS)[number];

/** Appearances that name a style rather than a bare brightness. */
export type StyleAppearance = Exclude<Appearance, "system" | "light" | "dark">;

/**
 * Brightness each style pins.
 *
 * Because only one appearance can be active, a style cannot also defer to the
 * OS setting — it has to commit. Flip a value here to change which form of a
 * style the list offers.
 */
export const STYLE_SCHEME: Record<StyleAppearance, ColorScheme> = Object.freeze({
  amoled: "dark",
  sepia: "light",
  contrast: "light",
  steam: "dark",
  blurple: "dark",
  nintendo: "light",
  playstation: "light",
  xbox: "dark",
});

/** The palette variant an appearance selects. */
export function appearanceStyle(appearance: Appearance): ThemeStyle {
  return appearance in STYLE_SCHEME ? (appearance as StyleAppearance) : "default";
}

/** The brightness an appearance resolves to. */
export function appearanceScheme(
  appearance: Appearance,
  systemScheme: ColorScheme,
): ColorScheme {
  if (appearance === "system") return systemScheme;
  if (appearance === "light" || appearance === "dark") return appearance;
  return STYLE_SCHEME[appearance as StyleAppearance];
}

export function isAppearance(value: unknown): value is Appearance {
  return (
    typeof value === "string" && (APPEARANCE_IDS as readonly string[]).includes(value)
  );
}

/**
 * The palette an appearance would produce — without selecting it.
 *
 * Used by the Appearance list, which renders every row in the palette it is
 * offering so the user can see a look before committing to it. Two reads of the
 * same appearance return the identical object (see `resolvePalette`'s cache), so
 * a row can memoize on its palette safely.
 */
export function resolveAppearancePalette(
  appearance: Appearance,
  systemScheme: ColorScheme,
  accent: AccentId = "auto",
): ThemeColors {
  return resolvePalette(
    appearanceScheme(appearance, systemScheme),
    appearanceStyle(appearance),
    accent,
  );
}

export const ACCENT_IDS: readonly ConcreteAccentId[] = Object.freeze(
  Object.keys(ACCENTS) as ConcreteAccentId[],
);

/**
 * Retunes an accent so it is usable as text.
 *
 * A fixed target lightness does not work: the same value that makes navy
 * legible on a near-black background leaves mid-tone hues (purple, gold) short
 * of AA. So the lightness is walked away from the background until the color
 * is legible against *both* the screen background and a raised surface, which
 * is the weaker of the two, and the accent's own hue and saturation are kept.
 */
function legibleVariant(value: string, base: ThemeColors, scheme: ColorScheme): string {
  const parsed = parseColor(value);
  if (!parsed) return value;

  const { h, s, l } = rgbToHsl(parsed);
  const candidate = (lightness: number): string =>
    formatColor(hslToRgb({ h, s, l: lightness }));

  const surfaces = [base.background, over(base.surface, base.background)];
  const isLegible = (lightness: number): boolean => {
    const text = candidate(lightness);
    return surfaces.every((bg) => contrastRatio(text, bg) >= MIN_TEXT_CONTRAST);
  };

  if (isLegible(l)) return candidate(l);

  const step = scheme === "dark" ? 1 : -1;
  for (let lightness = l + step; lightness <= 100 && lightness >= 0; lightness += step) {
    if (isLegible(lightness)) return candidate(lightness);
  }

  // Unreachable for any sane background: white is always legible on dark and
  // black always on light. Kept so a pathological palette degrades to
  // something readable rather than to the input value.
  return candidate(scheme === "dark" ? 100 : 0);
}

/** AA for body text. Mirrors the threshold `scripts/check-theme.ts` asserts. */
const MIN_TEXT_CONTRAST = 4.5;

/**
 * Applies an accent to a palette.
 *
 * Accent-derived tokens are retinted by swapping RGB while preserving the
 * alpha authored in the base palette, so the per-scheme translucency tuned in
 * `colors.ts` is reused rather than recomputed. Tokens whose base value was
 * expressed in terms of `accentText` (surface, border, stripe, accentBorder)
 * take the retuned `accentText` hue; `accentSurface` takes the fill hue.
 */
function applyAccent(
  palette: ThemeColors,
  scheme: ColorScheme,
  accent: ConcreteAccentId,
  tintSurface: boolean,
  tintTextMuted: boolean,
): ThemeColors {
  const fill = ACCENTS[accent];
  const fillRgb = parseColor(fill);
  if (!fillRgb) return palette;

  const accentText = legibleVariant(fill, palette, scheme);
  const textRgb = parseColor(accentText);

  const retinted: ThemeColors = {
    ...palette,
    accent: fill,
    accentText,
    onAccent: readableForeground(fill),
  };

  if (textRgb) {
    retinted.accentBorder = withRgb(palette.accentBorder, textRgb);
    if (tintSurface) {
      retinted.surface = withRgb(palette.surface, textRgb);
      retinted.border = withRgb(palette.border, textRgb);
      retinted.stripe = withRgb(palette.stripe, textRgb);
    }
  }
  retinted.accentSurface = withRgb(palette.accentSurface, fillRgb);

  if (tintTextMuted) retinted.textMuted = accentText;

  return retinted;
}

/**
 * Cache of composed palettes.
 *
 * Keyed by the full identity of a combination so that switching themes back
 * and forth returns the *same* frozen object. `useThemeStyles` memoizes on the
 * palette reference, so identity must be stable or every navigation would
 * rebuild every stylesheet.
 */
const PALETTE_CACHE = new Map<string, ThemeColors>();

/**
 * Composes the active palette.
 *
 * @param scheme resolved brightness — never "system"
 * @param style  palette variant
 * @param accent `"auto"` keeps the style's own accent; otherwise the accent hue
 *               is applied as a transform.
 */
export function resolvePalette(
  scheme: ColorScheme,
  style: ThemeStyle,
  accent: AccentId = "auto",
): ThemeColors {
  const effectiveStyle: ThemeStyle = isThemeStyle(style) ? style : "default";
  // `random` is a persisted *preference*; the store resolves it to a concrete
  // accent before it can reach here, but guard anyway so a bad call cannot
  // silently produce a palette.
  const effectiveAccent: AccentId =
    effectiveStyle && isAccentId(accent) && accent !== "random" ? accent : "auto";

  const cacheKey = `${scheme}|${effectiveStyle}|${effectiveAccent}`;
  const cached = PALETTE_CACHE.get(cacheKey);
  if (cached) return cached;

  const base = BASE_PALETTES[scheme];
  const override = STYLES[effectiveStyle][scheme];

  const tintSurface = override.tintSurface ?? true;
  const tintTextMuted = override.tintTextMuted ?? TEXT_MUTED_TINTED[scheme];

  const styled: ThemeColors = { ...base, ...stripConfig(override) };
  const composed =
    effectiveAccent === "auto"
      ? styled
      : applyAccent(styled, scheme, effectiveAccent, tintSurface, tintTextMuted);

  // Derived rather than authored: a style that overrides `accent` would
  // otherwise have to remember to override `onAccent` too, and a stale pairing
  // is unreadable rather than merely wrong.
  composed.onAccent = readableForeground(composed.accent);

  const palette = Object.freeze(composed);
  PALETTE_CACHE.set(cacheKey, palette);
  return palette;
}

/** Removes the `tint*` configuration flags so they cannot leak into a palette. */
function stripConfig(override: StyleOverride): Partial<ThemeColors> {
  const tokens: Record<string, string> = {};
  for (const [key, value] of Object.entries(override)) {
    if (key === "tintSurface" || key === "tintTextMuted") continue;
    if (typeof value === "string") tokens[key] = value;
  }
  return tokens as Partial<ThemeColors>;
}

export function isThemeStyle(value: unknown): value is ThemeStyle {
  return typeof value === "string" && value in STYLES;
}

export function isAccentId(value: unknown): value is AccentId {
  return (
    value === "auto" ||
    value === "random" ||
    (typeof value === "string" && value in ACCENTS)
  );
}

/** Picks a random accent, used when the user selects the "random" option. */
export function randomAccent(): ConcreteAccentId {
  const all = ACCENT_IDS;
  return all[Math.floor(Math.random() * all.length)] ?? "blue";
}
