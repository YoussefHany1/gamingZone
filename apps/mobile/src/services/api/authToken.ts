/**
 * Firebase ID tokens for authenticated backend calls.
 *
 * Shared by every API module that talks to a protected route (linked accounts,
 * Discord sign-in) so the "wait for the session to be restored" behaviour is
 * implemented once.
 */
import type { FirebaseAuthTypes } from "@react-native-firebase/auth";
import { logger } from "@/src/lib/logger";

/**
 * Waits for Firebase to restore the signed-in user. On a cold start (the app
 * was launched by a deep link) the session is restored asynchronously, and a
 * request issued in that window would be rejected.
 */
function waitForAuthUser(authModule: {
  (): FirebaseAuthTypes.Module;
}): Promise<FirebaseAuthTypes.User | null> {
  return new Promise((resolve) => {
    let settled = false;
    // Held in an object so the cleanup callback never touches a binding that
    // is still in its temporal dead zone.
    const cleanup: { unsubscribe?: () => void } = {};

    const finish = (user: FirebaseAuthTypes.User | null) => {
      if (settled) return;
      settled = true;
      resolve(user);
    };

    const timer = setTimeout(() => {
      cleanup.unsubscribe?.();
      finish(null);
    }, 5000);

    cleanup.unsubscribe = authModule().onAuthStateChanged((user) => {
      if (!user) return;
      clearTimeout(timer);
      cleanup.unsubscribe?.();
      finish(user);
    });
  });
}

/** Options for {@link getBackendIdToken}. */
export type BackendIdTokenOptions = {
  /**
   * Forces a network refresh so the backend sees the current token — and with
   * it the current `auth_time`. Required right after a re-authentication,
   * because a cached token would still carry the old sign-in time.
   */
  forceRefresh?: boolean;
};

/** Returns a valid, capped Firebase ID token for backend auth. */
export async function getBackendIdToken({
  forceRefresh = false,
}: BackendIdTokenOptions = {}): Promise<string | null> {
  try {
    const { default: auth } = await import("@react-native-firebase/auth");
    const user = auth().currentUser ?? (await waitForAuthUser(auth));
    if (!user) {
      logger.warn(
        "[authToken] getBackendIdToken: no auth().currentUser — user not signed in",
      );
      return null;
    }
    return await user.getIdToken(forceRefresh);
  } catch (error: unknown) {
    logger.error("[authToken] getBackendIdToken failed", error as Error);
    return null;
  }
}
