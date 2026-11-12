import { create } from "zustand";

/**
 * Button style carried over from React Native's `Alert` so migrating call
 * sites keeps its native semantics: "cancel" marks the dismissive action and
 * also answers backdrop taps / the Android back button, while "destructive"
 * renders the danger treatment.
 */
export type AlertButtonStyle = "default" | "cancel" | "destructive";

export interface AlertButton {
  text: string;
  style?: AlertButtonStyle;
  onPress?: () => void;
}

/** Everything `AlertHost` needs to render one alert. */
export interface AlertConfig {
  title?: string | undefined;
  message?: string | undefined;
  buttons?: AlertButton[] | undefined;
  /**
   * Whether tapping the backdrop (or the Android back button) dismisses the
   * alert, routing the dismissal through the "cancel" button when one exists.
   * Mirrors the 4th argument of `Alert.alert`.
   */
  cancelable?: boolean | undefined;
}

interface AlertState {
  /** The alert to render, or null when nothing is shown. */
  alert: AlertConfig | null;
  showAlert: (config: AlertConfig) => void;
  hideAlert: () => void;
}

export const useAlertStore = create<AlertState>((set) => ({
  alert: null,
  showAlert: (config) => set({ alert: config }),
  hideAlert: () => set({ alert: null }),
}));
