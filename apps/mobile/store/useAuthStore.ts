import { create } from "zustand";
import { AppState, AppStateStatus } from "react-native";
import auth, { FirebaseAuthTypes } from "@react-native-firebase/auth";
import analytics from "@react-native-firebase/analytics";

interface AuthState {
  user: FirebaseAuthTypes.User | null;
  isLoading: boolean;
}

interface AuthActions {
  /** Call once on app mount. Returns the cleanup function for useEffect. */
  initAuth: () => () => void;
  /** Manually refresh the user snapshot (e.g. after updateProfile). */
  refreshUser: () => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  isLoading: true,

  refreshUser: () => {
    set({ user: auth().currentUser });
  },

  initAuth: () => {
    // Mirrors the AppState ref that was in App.tsx
    let currentAppState: AppStateStatus = AppState.currentState;
    let resumeTimer: ReturnType<typeof setTimeout> | null = null;

    // ── Firebase auth listener ───────────────────────────────────────────────
    const unsubscribeAuth = auth().onAuthStateChanged(
      async (newUser: FirebaseAuthTypes.User | null) => {
        if (!newUser) {
          try {
            await auth().signInAnonymously();
            // onAuthStateChanged will fire again with the anonymous user
          } catch {
            // If anonymous sign-in fails, unblock the loading state so the
            // app doesn't freeze on a blank screen.
            set({ isLoading: false });
          }
          return;
        }

        set({ user: newUser, isLoading: false });

        // Analytics — identical to the original App.tsx behaviour
        try {
          await analytics().setUserId(newUser.uid);
          await analytics().setUserProperty(
            "email_verified",
            String(newUser.emailVerified),
          );
          await analytics().setUserProperty(
            "is_anonymous",
            String(newUser.isAnonymous),
          );
        } catch {
          // Non-fatal — analytics failure should never block the UI
        }
      },
    );

    // ── AppState resume-timer guard ──────────────────────────────────────────
    // When the OS suspends the JS thread for a long time and then resumes,
    // React state resets but Firebase's native layer still knows the current
    // user. If we're still in "loading" state when coming to foreground, give
    // the auth listener 2 s to fire naturally — if it doesn't, read
    // currentUser directly from the native module and clear loading ourselves.
    const handleAppStateChange = (nextState: AppStateStatus): void => {
      const prev = currentAppState;
      currentAppState = nextState;

      const comingToForeground =
        (prev === "background" || prev === "inactive") &&
        nextState === "active";

      if (!comingToForeground) return;

      resumeTimer = setTimeout(() => {
        // Use get() to read the live state — no stale closure risk
        if (!get().isLoading) return; // already resolved, nothing to do

        // Auth listener didn't fire in time — read from native layer directly
        set({ user: auth().currentUser, isLoading: false });
      }, 2000);
    };

    const appStateSub = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );

    // ── Cleanup (returned to useEffect's return slot in App.tsx) ────────────
    return () => {
      unsubscribeAuth();
      appStateSub.remove();
      if (resumeTimer) clearTimeout(resumeTimer);
    };
  },
}));
