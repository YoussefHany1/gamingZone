import { create } from "zustand";
import { auth } from "../lib/firebase";
import { onAuthStateChanged, signInAnonymously, User } from "firebase/auth";

interface AuthState {
  user: User | null;
  isLoading: boolean;
}

interface AuthActions {
  /** Call once on app mount. Returns the cleanup function for useEffect. */
  initAuth: () => () => void;
  /** Manually refresh the user snapshot (e.g. after updateProfile). */
  refreshUser: () => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isLoading: true,

  refreshUser: () => {
    set({ user: auth.currentUser });
  },

  initAuth: () => {
    const unsubscribe = onAuthStateChanged(auth, async (newUser) => {
      if (!newUser) {
        try {
          // If no user is logged in, sign in anonymously to keep database operations working
          await signInAnonymously(auth);
        } catch (error) {
          console.error("Anonymous authentication failed:", error);
          set({ isLoading: false });
        }
        return;
      }
      set({ user: newUser, isLoading: false });
    });

    return unsubscribe;
  },
}));
