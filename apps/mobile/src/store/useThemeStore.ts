import { Appearance, type ColorSchemeName } from "react-native";
import { create } from "zustand";
import { storageGet, storageSet } from "@/src/lib/storage";
import type { ColorScheme, ThemeMode } from "@/src/constants/colors";

interface ThemeState {
  /** User preference. Persisted. */
  mode: ThemeMode;
  /** Current OS setting. Read-only. */
  systemScheme: ColorScheme;
  /** `mode` resolved against `systemScheme`. */
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
}

const THEME_MODE_KEY = "@theme_mode";

function isThemeMode(value: unknown): value is ThemeMode {
  return value === "system" || value === "light" || value === "dark";
}

/** RN's `ColorSchemeName` also allows "unspecified"/null — treat those as dark. */
function normalizeScheme(scheme: ColorSchemeName | null | undefined): ColorScheme {
  return scheme === "light" ? "light" : "dark";
}

function readStoredMode(): ThemeMode {
  const stored = storageGet<ThemeMode>(THEME_MODE_KEY);
  return isThemeMode(stored) ? stored : "dark";
}

function resolveIsDark(mode: ThemeMode, systemScheme: ColorScheme): boolean {
  return mode === "system" ? systemScheme === "dark" : mode === "dark";
}

const initialMode = readStoredMode();
const initialSystemScheme = normalizeScheme(Appearance.getColorScheme());

export const useThemeStore = create<ThemeState>()((set, get) => ({
  // Dark is the default so the app looks identical to the previous
  // dark-only build for users who never open Appearance settings.
  mode: initialMode,
  systemScheme: initialSystemScheme,
  isDark: resolveIsDark(initialMode, initialSystemScheme),

  setMode: (mode) => {
    const { mode: current, systemScheme } = get();
    if (current === mode) return;
    storageSet(THEME_MODE_KEY, mode);
    set({ mode, isDark: resolveIsDark(mode, systemScheme) });
  },
}));

// Track the OS setting. Only meaningful while the user is on "system" —
// otherwise an OS change would fight the explicit preference.
Appearance.addChangeListener(({ colorScheme }) => {
  const { mode, systemScheme } = useThemeStore.getState();
  if (mode !== "system") return;

  const next = normalizeScheme(colorScheme);
  if (systemScheme === next) return;
  useThemeStore.setState({ systemScheme: next, isDark: next === "dark" });
});
