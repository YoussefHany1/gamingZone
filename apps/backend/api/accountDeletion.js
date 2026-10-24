/**
 * Account deletion.
 *
 * The client cannot do this on its own: Firestore rules only let the owner
 * delete `users/{uid}`, and deleting the Auth user first invalidates the very
 * session that would authorise the cleanup. So the destructive work happens
 * here, with the Admin SDK, behind a freshly verified session.
 *
 * Order matters: Firestore first, Auth last. If a Firestore step fails, the
 * Auth user still exists, the caller's token still verifies and a retry picks
 * up where the previous attempt stopped. Once Auth is gone the account cannot
 * be cleaned up by the client any more, so that is the final step.
 */
import { getAdmin } from './firebaseAdmin.js';

/** How old the token's `auth_time` may be before a re-auth is required. */
const RECENT_LOGIN_MAX_AGE_SECONDS = 5 * 60;

/** Firestore caps a batch write at 500 operations. */
const BATCH_LIMIT = 500;

/**
 * Registers `POST /account/delete`.
 *
 * `AppError`/`asyncRoute` are injected by index.js so this module does not
 * have to import from the entry point (which would be circular).
 */
export function registerAccountDeletionRoutes(app, { AppError, asyncRoute }) {
  /** An AppError carrying a machine-readable `code` for the client. */
  const deletionError = (message, status, code) => {
    const error = new AppError(message, status);
    error.code = code;
    return error;
  };

  app.post(
    '/account/delete',
    asyncRoute(async (req, res) => {
      const admin = await getAdmin();
      if (!admin) {
        throw deletionError(
          'Account deletion is not available right now',
          503,
          'not_configured',
        );
      }

      const header = req.headers.authorization || '';
      const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
      if (!token) {
        throw deletionError(
          'Authorization header with a Firebase ID token is required',
          401,
          'unauthenticated',
        );
      }

      let decoded;
      try {
        // `true` also checks that the token has not been revoked.
        decoded = await admin.auth.verifyIdToken(token, true);
      } catch (err) {
        console.warn(
          '[accountDeletion] verifyIdToken failed:',
          err?.code ?? err?.message ?? err,
        );
        throw deletionError('Invalid or expired session token', 401, 'unauthenticated');
      }

      const uid = decoded.uid;
      // `sign_in_provider` is set by Firebase, not by the caller.
      const anonymous = decoded.firebase?.sign_in_provider === 'anonymous';

      // A guest account has no credential to re-authenticate with and nothing
      // sensitive to protect, so the freshness check only applies to real
      // accounts. Fail closed when the claim is missing: an unexpected token
      // shape must never be the reason a destructive call skips the check.
      if (!anonymous) {
        const authTime = typeof decoded.auth_time === 'number' ? decoded.auth_time : 0;
        const ageSeconds = Math.floor(Date.now() / 1000) - authTime;
        if (!authTime || ageSeconds > RECENT_LOGIN_MAX_AGE_SECONDS) {
          throw deletionError(
            'Re-authentication required before deleting this account',
            403,
            'requires_recent_login',
          );
        }
      }

      console.log(
        '[accountDeletion] cleaning up uid:',
        uid,
        '| sign_in_provider:',
        decoded.firebase?.sign_in_provider ?? 'unknown',
      );

      // Dynamic import so a missing optional dependency cannot crash the whole
      // lambda at boot (see firebaseAdmin.js for the same reasoning).
      const { recursiveDelete } = await import('firebase-admin/firestore');

      // Removes the profile document plus every subcollection (wantList,
      // playedList, notificationPreferences, linkedAccounts, lists/*/games,
      // ratings). Not atomic: a partial failure leaves the Auth user in place,
      // which is exactly what makes a retry possible.
      await recursiveDelete(admin.firestore.doc(`users/${uid}`));

      // Server-owned secrets for linked platforms; deleting a missing document
      // is a no-op, so this is safe on a retry.
      await admin.firestore.collection('linkedAccountSecrets').doc(uid).delete();

      // Top-level collection keyed by discordId: a user may have more than one
      // Discord identity mapped, so they all have to go.
      const discordMappings = await admin.firestore
        .collection('discordAccounts')
        .where('uid', '==', uid)
        .get();

      for (let i = 0; i < discordMappings.docs.length; i += BATCH_LIMIT) {
        const batch = admin.firestore.batch();
        for (const doc of discordMappings.docs.slice(i, i + BATCH_LIMIT)) {
          batch.delete(doc.ref);
        }
        await batch.commit();
      }

      try {
        await admin.auth.deleteUser(uid);
      } catch (err) {
        // A retry after a half-completed run must still succeed.
        if (err?.code !== 'auth/user-not-found') throw err;
        console.log('[accountDeletion] auth user already removed:', uid);
      }

      res.setHeader('Cache-Control', 'no-store');
      res.status(200).json({ deleted: true, uid });
    }),
  );
}
