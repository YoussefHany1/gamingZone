import { useEffect } from "react";
import { AppState } from "react-native";
import firestore from "@react-native-firebase/firestore";
import type { FirebaseAuthTypes } from "@react-native-firebase/auth";
import { logger } from "@/src/lib/logger";

/**
 * Heartbeat for presence: writes `presence/{uid}.updatedAt = now` on app state
 * changes (foreground/background). Presence is client-computed: a user is
 * online if their `updatedAt` was within the last 5 minutes. The doc lives in
 * the dedicated (peer-readable) `presence` collection, not `users`.
 *
 * This hook is called from App.tsx with the Firebase `user` object, so it
 * only activates when a user is authenticated.
 */
export function usePresenceHeartbeat(user: FirebaseAuthTypes.User | null): void {
  useEffect(() => {
    if (!user || user.isAnonymous) return;

    const updatePresence = async (): Promise<void> => {
      try {
        // A dedicated `presence/{uid}` doc (firestore.rules) — the private
        // users/{uid} docs are unreadable to peers, so would-be readers could
        // never see a heartbeat stored there.
        await firestore().collection("presence").doc(user.uid).set({
          updatedAt: Date.now(),
        });
      } catch (error) {
        logger.warn("[presence] Heartbeat write failed", error);
      }
    };

    // Initial write on mount (fresh app open or sign-in). Do not write while
    // the app is already backgrounded, which can happen during cold-start
    // restoration on Android.
    if (AppState.currentState === "active") {
      void updatePresence();
    }

    // Refresh only when the app returns to the foreground. Background writes
    // consume battery and can incorrectly make a user appear active after
    // leaving the app.
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void updatePresence();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [user]);
}
