import { User } from "firebase/auth";

export interface LangState {
  lang: "en" | "ar";
  setLang: (lang: "en" | "ar") => void;
  t: (key: string, replacements?: Record<string, string | number>) => string;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
}

export interface AuthActions {
  /** Call once on app mount. Returns the cleanup function for useEffect. */
  initAuth: () => () => void;
  /** Manually refresh the user snapshot (e.g. after updateProfile). */
  refreshUser: () => void;
}

export type AuthStore = AuthState & AuthActions;
