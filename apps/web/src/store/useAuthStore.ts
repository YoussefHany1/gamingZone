import { create } from "zustand";
import { auth } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

import { AuthStore } from "./types";

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isLoading: true,

  refreshUser: () => {
    set({ user: auth.currentUser });
  },

  initAuth: () => {
    const unsubscribe = onAuthStateChanged(auth, (newUser) => {
      // Set the user (or null if not logged in) and stop loading
      set({ user: newUser, isLoading: false });
    });

    return unsubscribe;
  },
}));
