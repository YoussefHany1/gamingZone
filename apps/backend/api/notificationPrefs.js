/**
 * Notification preference toggles — the trusted Firestore write.
 *
 * The mobile client used to run the `notificationPreferences` write and the
 * shared `notificationStats` counter update in a client-side transaction, so
 * the rules had to allow every signed-in user to write the shared stats
 * collection — meaning any authenticated user could falsify `enabledCount`
 * for everyone. The rules are now locked (`write: if false`) and the toggle
 * flows through here instead:
 *
 *   POST /notifications/preferences/toggle
 *   Authorization: Bearer <Firebase ID token>
 *   { category, sourceName, enabled }
 *
 * The FCM topic (un)subscribe stays on the device — it is per-install-token
 * by nature — while the two Firestore documents become server-write-only.
 *
 * Error contract: 4xx responses carry an English message; the client maps
 * failures to a localised toast and keeps its FCM state consistent.
 */
import { getAdmin } from './firebaseAdmin.js';

/** Port of the mobile `NotificationService.getTopicName` (identical topic ids). */
function getTopicName(category, sourceName) {
  if (!category || !sourceName) return '';
  const sanitize = (value) =>
    String(value)
      .toLowerCase()
      .replace(/[^a-z0-9-_.~%]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  return `${sanitize(category)}_${sanitize(sourceName)}`;
}

/** Same middleware contract as social.js/ai.js. */
function requireAuth(AppError) {
  return async (req, _res, next) => {
    const admin = await getAdmin();
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
    if (!token || !admin) {
      return next(new AppError('Authorization header with a Firebase ID token is required', 401));
    }
    try {
      const decoded = await admin.auth.verifyIdToken(token, true);
      req.authUid = decoded.uid;
      next();
    } catch (err) {
      console.warn('[notificationPrefs] verifyIdToken failed:', err?.code ?? err?.message ?? err);
      return next(new AppError('Invalid or expired session token', 401));
    }
  };
}

export function registerNotificationPreferenceRoutes(app, { AppError, asyncRoute }) {
  const auth = requireAuth(AppError);

  app.post(
    '/notifications/preferences/toggle',
    auth,
    asyncRoute(async (req, res) => {
      const { category, sourceName, enabled } = req.body ?? {};

      if (typeof category !== 'string' || !category.trim()) {
        throw new AppError('category is required', 400);
      }
      if (typeof sourceName !== 'string' || !sourceName.trim()) {
        throw new AppError('sourceName is required', 400);
      }
      if (typeof enabled !== 'boolean') {
        throw new AppError('enabled must be a boolean', 400);
      }
      if (category.length > 100 || sourceName.length > 100) {
        throw new AppError('category/sourceName are limited to 100 characters', 400);
      }

      const admin = await getAdmin();
      if (!admin) {
        throw new AppError('Notification service is not configured', 500);
      }

      const topicId = getTopicName(category, sourceName);
      if (!topicId) {
        throw new AppError('category/sourceName produced an empty topic id', 400);
      }

      const { Timestamp } = await import('firebase-admin/firestore');
      const userRef = admin.firestore.collection('users').doc(req.authUid);
      const prefRef = userRef.collection('notificationPreferences').doc(topicId);
      const statsRef = admin.firestore.collection('notificationStats').doc(topicId);

      const enabledCount = await admin.firestore.runTransaction(async (transaction) => {
        // Firestore requires ALL reads to happen before ANY writes.
        const [prefSnapshot, statsSnapshot] = await Promise.all([
          transaction.get(prefRef),
          transaction.get(statsRef),
        ]);

        const previousEnabled = prefSnapshot.exists()
          ? Boolean(prefSnapshot.data()?.enabled)
          : false;

        const delta = (enabled ? 1 : 0) - (previousEnabled ? 1 : 0);
        const currentCount = statsSnapshot.exists()
          ? statsSnapshot.data()?.enabledCount
          : 0;
        const nextCount = Math.max(0, (Number.isFinite(currentCount) ? currentCount : 0) + delta);

        // All writes happen after all reads.
        transaction.set(
          prefRef,
          {
            category,
            sourceName,
            enabled,
            topicId,
            updatedAt: Timestamp.now(),
          },
          { merge: true },
        );
        transaction.set(
          statsRef,
          {
            category,
            sourceName,
            topicId,
            enabledCount: nextCount,
            updatedAt: Timestamp.now(),
          },
          { merge: true },
        );

        return nextCount;
      });

      res.setHeader('Cache-Control', 'no-store');
      res.json({ ok: true, topicId, enabledCount });
    }),
  );
}
