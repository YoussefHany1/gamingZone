import { FieldValue } from 'firebase-admin/firestore';
import { initFirebaseAdmin } from './lib/firebaseAdmin';
import { logger } from './lib/logger';

// Grants (or revokes with --revoke) the `admin` custom claim on a Firebase
// Auth user. The claim is the only trusted admin signal (firestore.rules and
// the /admin/* API both check it); `users/{uid}.isAdmin` is mirrored here for
// display/diagnostics only.
//
// Usage:
//   npm run admin:claim -- <uid>            # grant
//   npm run admin:claim -- <uid> --revoke   # revoke

async function main(): Promise<void> {
  const [uid, flag] = process.argv.slice(2);

  if (!uid) {
    logger.error('Usage: tsx ./scripts/setAdminClaim.ts <uid> [--revoke]');
    process.exit(1);
  }

  const { admin, enabled, error } = initFirebaseAdmin('adminClaim');

  if (!enabled) {
    logger.error(
      `Firebase Admin init failed${error ? `: ${error}` : ' — is FCM_SERVICE_ACCOUNT set in apps/backend/.env?'}`,
    );
    process.exit(1);
  }

  const app = admin.app('adminClaim');
  if (!app) {
    logger.error('❌ Firebase app "adminClaim" is not initialized.');
    process.exit(1);
  }

  const claims = await admin
    .auth(app)
    .getUser(uid)
    .then((u) => u.customClaims ?? {});

  if (flag === '--revoke') {
    delete claims.admin;
  } else {
    claims.admin = true;
  }

  await admin.auth(app).setCustomUserClaims(uid, claims);
  logger.info(`✅ customClaims for ${uid}: ${JSON.stringify(claims)}`);

  // Mirror the claim into the user document (display-only state). Admin SDK
  // writes bypass firestore.rules, which deny clients the `isAdmin` field.
  try {
    const userRef = admin.firestore(app).collection('users').doc(uid);
    const userSnap = await userRef.get();
    if (userSnap.exists) {
      await userRef.set(
        { isAdmin: claims.admin === true, updatedAt: FieldValue.serverTimestamp() },
        { merge: true },
      );
      logger.info(`🪞 users/${uid}.isAdmin = ${claims.admin === true}`);
    } else {
      logger.warn(`⚠ users/${uid} does not exist — claim set, mirror skipped`);
    }
  } catch (err) {
    logger.warn(err, 'Mirroring isAdmin into Firestore failed (claim still set)');
  }

  // Existing ID tokens keep their old claims for up to ~1h until refreshed.
  await admin.auth(app).revokeRefreshTokens(uid);
  logger.info('↻ refresh tokens revoked — user re-authenticates on next app launch');
}

main()
  .then(() => setTimeout(() => process.exit(0), 250))
  .catch((err) => {
    logger.error(err, 'Fatal Error');
    setTimeout(() => process.exit(1), 250);
  });
