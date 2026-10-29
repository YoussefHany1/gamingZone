import { getAdmin } from '../../../api/firebaseAdmin.js';
import { sendPushToUids } from '../../../api/push.js';
import { sessionReminderMessage } from '../../../api/i18n.js';

const REMINDER_WINDOWS = [
  { key: '60', offsetMs: 60 * 60 * 1000 },
  { key: '15', offsetMs: 15 * 60 * 1000 },
  { key: 'starting', offsetMs: 0 },
] as const;

type ReminderKey = (typeof REMINDER_WINDOWS)[number]['key'];

function formatTime(startsAt: number): string {
  return new Date(startsAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/**
 * Sends due session reminders and completes sessions after their start time.
 * Reminder keys match the `remindersSent` object created by sessions.js.
 * A transaction claims each key before delivery, making overlapping cron runs
 * idempotent. Push delivery remains best-effort, like all social notifications.
 */
export async function runSessionReminders() {
  const admin = await getAdmin();
  if (!admin) return { reminderCount: 0, completedCount: 0, logs: ['Firebase unavailable'] };

  const db = admin.firestore;
  const now = Date.now();
  const logs: string[] = [];
  const sessionsSnap = await db.collection('playSessions').where('status', '==', 'confirmed').get();
  let reminderCount = 0;
  let completedCount = 0;

  for (const sessionDoc of sessionsSnap.docs) {
    const session = sessionDoc.data();
    const startsAt = Number(session.startsAt);
    const participants = Array.isArray(session.participantUids) ? session.participantUids : [];
    if (!Number.isFinite(startsAt) || participants.length === 0) continue;

    const sent = session.remindersSent && typeof session.remindersSent === 'object'
      ? session.remindersSent
      : {};
    const gameName = typeof session.gameName === 'string' ? session.gameName : 'Game';

    for (const window of REMINDER_WINDOWS) {
      if (now < startsAt - window.offsetMs || sent[window.key]) continue;

      // Claim before sending so two hourly invocations cannot send the same key.
      const claimed = await db.runTransaction(async (transaction) => {
        const fresh = await transaction.get(sessionDoc.ref);
        const data = fresh.data() ?? {};
        if (data.status !== 'confirmed' || data.remindersSent?.[window.key]) return false;
        transaction.update(sessionDoc.ref, { [`remindersSent.${window.key}`]: true });
        return true;
      });
      if (!claimed) continue;

      const userSnapshots = await db.getAll(
        ...participants.map((uid: string) => db.collection('users').doc(uid)),
      );
      const byLocale = new Map<string, string[]>();
      userSnapshots.forEach((userSnapshot, index) => {
        const locale = typeof userSnapshot.get('language') === 'string' ? userSnapshot.get('language') : 'en';
        const uids = byLocale.get(locale) ?? [];
        uids.push(participants[index]);
        byLocale.set(locale, uids);
      });

      let sent = 0;
      for (const [locale, uids] of byLocale) {
        const result = await sendPushToUids(uids, {
          ...sessionReminderMessage(locale, window.key, { gameName, time: formatTime(startsAt) }),
          data: { type: 'session_reminder', sessionId: sessionDoc.id, window: window.key },
        });
        sent += result.sent;
      }
      reminderCount++;
      logs.push(`session-reminders: sent ${window.key} for ${sessionDoc.id} (${sent} device(s))`);
    }

    if (startsAt <= now) {
      await sessionDoc.ref.update({ status: 'completed' });
      completedCount++;
      logs.push(`session-reminders: marked ${sessionDoc.id} completed`);
    }
  }

  logs.unshift(`session-reminders: checked ${sessionsSnap.size} confirmed session(s)`);
  return { reminderCount, completedCount, logs };
}
