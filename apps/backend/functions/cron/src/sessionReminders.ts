import { getAdmin } from '../../../api/firebaseAdmin.js';

/**
 * Runs the session housekeeping cron. As of the mobile client's local
 * reminder feature (scheduled local notifications via expo-notifications,
 * with a user-adjustable lead time), FCM session reminders were retired:
 * a push here would duplicate the device-local notification. The local
 * scheduler also has no fixed 60/15/0 windows to mirror.
 *
 * What intentionally REMAINS: auto-completing confirmed sessions once their
 * start time passes — sessions.js has no other sweeper.
 */
export async function runSessionReminders() {
  const admin = await getAdmin();
  if (!admin) return { reminderCount: 0, completedCount: 0, logs: ['Firebase unavailable'] };

  const db = admin.firestore;
  const now = Date.now();
  const logs: string[] = [];
  const sessionsSnap = await db.collection('playSessions').where('status', '==', 'confirmed').get();
  let completedCount = 0;

  for (const sessionDoc of sessionsSnap.docs) {
    const session = sessionDoc.data();
    const startsAt = Number(session.startsAt);
    if (!Number.isFinite(startsAt)) continue;

    if (startsAt <= now) {
      await sessionDoc.ref.update({ status: 'completed' });
      completedCount++;
      logs.push(`session-reminders: marked ${sessionDoc.id} completed`);
    }
  }

  logs.unshift(`session-reminders: checked ${sessionsSnap.size} confirmed session(s)`);
  return { reminderCount: 0, completedCount, logs };
}
