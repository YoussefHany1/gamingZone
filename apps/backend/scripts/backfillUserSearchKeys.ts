import { initFirebaseAdmin } from './lib/firebaseAdmin';
import { logger } from './lib/logger';

// Backfills the normalized keys used by the admin dashboard's prefix search:
//   - `displayNameLower` = displayName trimmed + lowercased (max 80 chars)
//   - `emailLower`       = email trimmed + lowercased (max 80 chars)
//
// Registrations and profile saves write these going forward; this script covers
// accounts that predate the fields. Re-running is safe: documents whose keys
// already match are skipped (no write, no extra index cost).
//
// Usage:
//   npm run backfill:user-search -- --dry-run
//   npm run backfill:user-search
//   npm run backfill:user-search -- --limit 500

const PAGE_SIZE = 400;
const KEY_LIMIT = 80;

function hasFlag(name: string): boolean {
  return process.argv.slice(2).includes(name);
}

function getNumericArg(name: string): number | null {
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === name) {
      const next = argv[i + 1];
      const value = next ? Number(next) : NaN;
      return Number.isFinite(value) ? value : null;
    }
    if (arg.startsWith(`${name}=`)) {
      const value = Number(arg.slice(`${name}=`.length));
      return Number.isFinite(value) ? value : null;
    }
  }
  return null;
}

/** Mirrors `toDisplayNameKey` / `toEmailKey` in the mobile app. */
function normalizeKey(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase().slice(0, KEY_LIMIT);
}

async function main(): Promise<void> {
  const dryRun = hasFlag('--dry-run');
  const limit = getNumericArg('--limit');

  const { admin, enabled, error } = initFirebaseAdmin('backfillUserSearchKeys');

  if (!enabled) {
    logger.error(
      `Firebase Admin init failed${error ? `: ${error}` : ' — is FCM_SERVICE_ACCOUNT set in apps/backend/.env?'}`,
    );
    process.exit(1);
  }

  const app = admin.app('backfillUserSearchKeys');
  if (!app) {
    logger.error('❌ Firebase app "backfillUserSearchKeys" is not initialized.');
    process.exit(1);
  }

  const db = admin.firestore(app);
  const users = db.collection('users');

  let lastId: string | null = null;
  let scanned = 0;
  let pending = 0;

  while (true) {
    let query = users
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(PAGE_SIZE);
    if (lastId) query = query.startAfter(lastId);

    const snapshot = await query.get();
    if (snapshot.empty) break;

    const batch = db.batch();
    let batchWrites = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data() ?? {};
      const displayNameLower = normalizeKey(data.displayName);
      const emailLower = normalizeKey(data.email);
      const patch: Record<string, string> = {};

      if (data.displayNameLower !== displayNameLower) {
        patch.displayNameLower = displayNameLower;
      }
      if (data.emailLower !== emailLower) {
        patch.emailLower = emailLower;
      }

      if (Object.keys(patch).length === 0) continue;

      batchWrites += 1;
      if (!dryRun) batch.update(doc.ref, patch);
    }

    if (!dryRun && batchWrites > 0) await batch.commit();

    scanned += snapshot.docs.length;
    pending += batchWrites;
    lastId = snapshot.docs[snapshot.docs.length - 1].id;

    logger.info(
      `scanned ${scanned} user(s) — ${dryRun ? 'would update' : 'updated'} ${pending}`,
    );

    if (limit !== null && scanned >= limit) break;
    if (snapshot.docs.length < PAGE_SIZE) break;
  }

  logger.info(
    dryRun
      ? `✅ Dry run complete: ${pending} of ${scanned} user(s) need normalized keys.`
      : `✅ Done: ${pending} of ${scanned} user(s) updated.`,
  );
}

main()
  .then(() => setTimeout(() => process.exit(0), 250))
  .catch((err) => {
    logger.error(err, 'Fatal Error');
    setTimeout(() => process.exit(1), 250);
  });
