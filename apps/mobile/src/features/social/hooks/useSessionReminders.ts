import { useEffect } from "react";
import type { FirebaseAuthTypes } from "@react-native-firebase/auth";
import { usePlaySessions } from "./usePlaySessions";
import { useSessionReminderOffset } from "./useSessionReminderOffset";
import {
  cancelAllSessionReminders,
  syncSessionReminders,
} from "../lib/sessionReminderScheduler";
import { runAfterInteractions } from "@/src/utils/runAfterInteractions";

/**
 * useSessionReminders — drives the reminder schedule for the signed-in user.
 *
 * Mounted at the root (App.tsx, next to usePresenceHeartbeat) rather than in
 * the Social screen on purpose: Android and iOS clear scheduled notifications
 * on device reboot, so the reminders must be re-armed by the first Firestore
 * snapshot the app receives on launch — before any navigation happens.
 *
 * The reconciliation is diff-based and idempotent: re-running it with no
 * session changes and no offset change touches nothing.
 */
export function useSessionReminders(
  user: FirebaseAuthTypes.User | null | undefined,
): void {
  const uid = user?.uid;
  // Subscribes to the user's play sessions at the root, so the Firestore
  // listener (and therefore the reminder restore after a reboot) is live
  // from the first paint.
  const sessions = usePlaySessions(uid ?? "");
  const { remindersEnabled, reminderMinutes } = useSessionReminderOffset();

  useEffect(() => {
    // uid === undefined covers the signed-out window before Firebase falls
    // back to a fresh anonymous session: nothing the next account inherits
    // should remain scheduled.
    if (!uid) {
      void cancelAllSessionReminders();
      return;
    }

    // Defer to after first-paint interactions — same policy as the FCM setup.
    const task = runAfterInteractions(() => {
      void syncSessionReminders(sessions, {
        enabled: remindersEnabled,
        offsetMin: reminderMinutes,
      });
    });
    return () => task.cancel();
  }, [uid, sessions, remindersEnabled, reminderMinutes]);
}
