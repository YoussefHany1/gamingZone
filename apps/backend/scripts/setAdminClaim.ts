import { loadBackendEnv } from './lib/env';
import { env } from './lib/config';
import { initFirebaseAdmin } from './lib/firebaseAdmin';
import { logger } from './lib/logger';

// Grants (or revokes with --revoke) the `admin` custom claim on a Firebase
// Auth user. Required by firestore.rules for admin aggregate reads.
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

  const { admin, enabled, error } = initFirebaseAdmin('FCM_SERVICE_ACCOUNT');

  if (!enabled) {
    logger.error(
      `Firebase Admin init failed${error ? `: ${error}` : ' — is FCM_SERVICE_ACCOUNT set in apps/backend/.env?'}`,
    );
    process.exit(1);
  }

  const claims = await admin.auth().getUser(uid).then((u) => u.customClaims ?? {});

  if (flag === '--revoke') {
    delete claims.admin;
  } else {
    claims.admin = true;
  }

  await admin.auth().setCustomUserClaims(uid, claims);
  logger.info(`✅ customClaims for ${uid}: ${JSON.stringify(claims)}`);

  // Existing ID tokens keep their old claims for up to ~1h until refreshed.
  await admin.auth().revokeRefreshTokens(uid);
  logger.info('↻ refresh tokens revoked — user re-authenticates on next app launch');
}

main()
  .then(() => setTimeout(() => process.exit(0), 250))
  .catch((err) => {
    logger.error(err, 'Fatal Error');
    setTimeout(() => process.exit(1), 250);
  });
