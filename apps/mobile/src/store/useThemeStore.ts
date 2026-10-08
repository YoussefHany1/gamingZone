import { Appearance as RNAppearance, type ColorSchemeName } from "react-native";
import { create } from "zustand";
import { storageGet, storageSet } from "@/src/lib/storage";
import type { ColorScheme, ThemeColors } from "@/src/constants/colors";
import {
  appearanceScheme,
  appearanceStyle,
  isAccentId,
  isAppearance,
  randomAccent,
  resolvePalette,
  type AccentId,
  type Appearance,
  type ConcreteAccentId,
  type ThemeStyle,
} from "@/src/constants/theme";

/** `accent` narrowed to what actually reaches the palette resolver. */
type ResolvedAccent = ConcreteAccentId | "auto";

interface ThemeState {
  /**
   * The selected appearance. Persisted. A single value, because an appearance
   * is chosen as a whole: picking "Steam Blue" selects its background, text
   * and brightness together, so there is no second thing to also select.
   */
  appearance: Appearance;
  /**
   * Accent preference. Persisted; `random` persists as the literal string.
   * Selecting an appearance resets this to `"auto"` so the theme and its
   * signature color always travel together.
   */
  accent: AccentId;
  /** Current OS setting. Read-only. */
  systemScheme: ColorScheme;

  /** `appearance` resolved against `systemScheme`. Derived. */
  scheme: ColorScheme;
  /** `scheme === "dark"`. Derived. */
  isDark: boolean;
  /** Palette variant behind `appearance`. Derived. */
  style: ThemeStyle;
  /** What `accent` resolves to, so `random` reports its current roll. Derived. */
  resolvedAccent: ResolvedAccent;
  /**
   * The composed palette. Derived, and stable by object identity.
   *
   * Exposed here so non-React code can read the active palette synchronously
   * via `useThemeStore.getState().colors` instead of branching on `isDark`
   * against the base palettes, which would ignore style and accent.
   */
  colors: ThemeColors;

  setAppearance: (appearance: Appearance) => void;
  setAccent: (accent: AccentId) => void;
}

const THEME_APPEARANCE_KEY = "@theme_appearance";
/** Superseded by `THEME_APPEARANCE_KEY`; read once to carry the choice over. */
const LEGACY_THEME_MODE_KEY = "@theme_mode";
const THEME_ACCENT_KEY = "@theme_accent";

function isThemeMode(value: unknown): value is Appearance {
  return value === "system" || value === "light" || value === "dark";
}

/** RN's `ColorSchemeName` also allows "unspecified"/null — treat those as dark. */
function normalizeScheme(scheme: ColorSchemeName | null | undefined): ColorScheme {
  return scheme === "light" ? "light" : "dark";
}

function readStoredAppearance(): Appearance {
  const stored = storageGet<Appearance>(THEME_APPEARANCE_KEY);
  if (isAppearance(stored)) return stored;

  // Earlier builds kept only a brightness preference, whose values are all
  // still valid appearances, so the migration is a straight carry-over.
  const legacy = storageGet<Appearance>(LEGACY_THEME_MODE_KEY);
  if (isThemeMode(legacy)) {
    storageSet(THEME_APPEARANCE_KEY, legacy);
    return legacy;
  }

  // Dark is the default so the app looks identical to the previous dark-only
  // build for users who never open Appearance settings.
  return "dark";
}

/**
 * Reads the stored accent and rolls `random` a fresh time.
 *
 * The roll is deliberately *not* persisted: only the literal preference is
 * written back, so "random" re-rolls once per cold start rather than per theme
 * change or navigation. That keeps the RGB-cycling feel without the palette
 * flickering mid-session.
 */
function readStoredAccent(): { accent: AccentId; resolved: ResolvedAccent } {
  const stored = storageGet<AccentId>(THEME_ACCENT_KEY);
  const accent: AccentId = isAccentId(stored) ? stored : "auto";
  if (accent === "random") return { accent, resolved: randomAccent() };
  return { accent, resolved: accent };
}

interface Derived {
  scheme: ColorScheme;
  isDark: boolean;
  style: ThemeStyle;
  colors: ThemeColors;
}

function derive(
  appearance: Appearance,
  systemScheme: ColorScheme,
  resolvedAccent: ResolvedAccent,
): Derived {
  const scheme = appearanceScheme(appearance, systemScheme);
  const style = appearanceStyle(appearance);
  return {
    scheme,
    isDark: scheme === "dark",
    style,
    colors: resolvePalette(scheme, style, resolvedAccent),
  };
}

const initialAppearance = readStoredAppearance();
const initialSystemScheme = normalizeScheme(RNAppearance.getColorScheme());
const initialAccent = readStoredAccent();

export const useThemeStore = create<ThemeState>()((set, get) => ({
  appearance: initialAppearance,
  accent: initialAccent.accent,
  systemScheme: initialSystemScheme,
  resolvedAccent: initialAccent.resolved,
  ...derive(initialAppearance, initialSystemScheme, initialAccent.resolved),

  // State is committed before persistence: subscribers paint from `set`, and a
  // storage write must never sit in front of that on the tap's critical path.
  setAppearance: (appearance) => {
    const { appearance: current, systemScheme } = get();
    if (current === appearance) return;
    // A theme is a whole: its own authored accent is the color that belongs
    // with it, so picking a theme also moves the accent to "auto" (which
    // resolves to that theme's accent). The user can still override it with a
    // manual accent afterwards.
    const accent: AccentId = "auto";
    const resolvedAccent: ResolvedAccent = "auto";
    set({
      appearance,
      accent,
      resolvedAccent,
      ...derive(appearance, systemScheme, resolvedAccent),
    });
    storageSet(THEME_APPEARANCE_KEY, appearance);
    storageSet(THEME_ACCENT_KEY, accent);
  },

  setAccent: (accent) => {
    const { accent: current, appearance, systemScheme } = get();
    if (current === accent) return;
    const resolvedAccent: ResolvedAccent = accent === "random" ? randomAccent() : accent;
    set({ accent, resolvedAccent, ...derive(appearance, systemScheme, resolvedAccent) });
    storageSet(THEME_ACCENT_KEY, accent);
  },
}));

// Track the OS setting. Only meaningful while the user is on "system" —
// otherwise an OS change would fight the explicit preference.
RNAppearance.addChangeListener(({ colorScheme }) => {
  const { appearance, systemScheme, resolvedAccent } = useThemeStore.getState();
  if (appearance !== "system") return;

  const next = normalizeScheme(colorScheme);
  if (systemScheme === next) return;
  useThemeStore.setState({
    systemScheme: next,
    ...derive(appearance, next, resolvedAccent),
  });
});
