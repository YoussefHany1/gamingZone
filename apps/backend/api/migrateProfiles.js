/**
 * Idempotent backfill for `profiles/{uid}` + `usernames/{handleLower}`.
 *
 * Moves the old `functions/scripts/migrateProfiles.ts` onto the free Vercel
 * backend: it runs locally (or in CI) with the same service-account credential
 * the API already uses, and reuses `claimHandleFor` so there is exactly one
 * implementation of the two-document handle contract.
 *
 *   npm run migrate:profiles        # writes
 *   npm run migrate:profiles:dry    # reports only
 *   npm run migrate:profiles -- --uid=<uid>
 *
 * Run from `apps/backend/api`, where `npm run` resolves the `.env` file.
 *
 * Why the skip condition is not "no profiles document":
 *
 *   Phase 1 can ship while this is still running, and the app lazily creates
 *   `profiles/{uid}` (via `/social/handle`) without a matching `usernames`
 *   entry if the request fails mid-way. A retry that only checked for the
 *   profile would strand that user forever. The predicate therefore checks the
 *   whole two-document contract, including that the reservation still belongs
 *   to the same uid.
 *
 * The script never deletes a profile; it only creates or patches handle fields,
 * so personalisation written by the user in the meantime is preserved.
 *
 * `migrationVersion` is the completion stamp, and it is written **after** the
 * link projection. A run that stops between the claim and the projection
 * therefore leaves the profile ready-but-unstamped; the next run repairs just
 * the projection and stamps it. Without the ordering, a transient
 * `syncProfileLinks` failure would be permanent, because "ready" would already
 * be true.
 */
import { getAdmin } from './firebaseAdmin.js';
import { claimHandleFor, handleCandidates, syncProfileLinks } from './social.js';

const DRY_RUN = process.argv.includes('--dry-run');
const ONLY_UID = process.argv.find((arg) => arg.startsWith('--uid='))?.slice('--uid='.length);

const PROFILE_BIO_MAX_LENGTH = 300;

function asString(value) {
  return typeof value === 'string' ? value : '';
}

function clampProfileText(value, maxLength) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

/**
 * `users.createdAt` is a Timestamp *or* an ISO string in production (the field
 * predates the current write path). Never let a malformed value abort a user.
 */
function createdAtTimestamp(value, Timestamp) {
  if (value && typeof value.toMillis === 'function') return value;
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return Timestamp.fromDate(parsed);
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Timestamp.fromMillis(value);
  }
  return Timestamp.now();
}

/** The two-document contract, evaluated outside a transaction. */
async function isReady(db, uid, profileSnap) {
  if (!profileSnap.exists) return false;

  const handle = asString(profileSnap.get('handleLower'));
  if (!handle) return false;

  const usernameSnap = await db.collection('usernames').doc(handle).get();
  return usernameSnap.exists && usernameSnap.get('uid') === uid;
}

/** True when the error is the "another account owns this handle" rejection. */
function isHandleTaken(error) {
  return error?.code === 'handle_taken' || error?.message === 'handle_taken';
}

/**
 * Claims the first free generated candidate.
 *
 * `claimHandleFor` is transactional per candidate, so a concurrent claim can
 * only cost us a retry on the next candidate — it can never produce two owners.
 */
async function claimFirstFree(uid, candidates) {
  for (const candidate of candidates) {
    try {
      return await claimHandleFor(uid, candidate);
    } catch (error) {
      if (isHandleTaken(error)) continue;
      throw error;
    }
  }
  throw new Error('no_free_handle');
}

async function repairUser(db, FieldValue, Timestamp, uid, userData, summary) {
  const profileRef = db.collection('profiles').doc(uid);
  const profileSnapBefore = await profileRef.get();
  const candidates = handleCandidates(asString(userData.displayName), uid);

  if (candidates.length === 0) {
    summary.failed += 1;
    console.error(`[migrate] ${uid}: could not derive any valid handle`);
    return;
  }

  if (DRY_RUN) {
    summary.planned += 1;
    console.log(
      `[migrate] ${uid}: would claim ${candidates[0]} (profile ${
        profileSnapBefore.exists ? 'exists' : 'missing'
      })`,
    );
    return;
  }

  const { handle } = await claimFirstFree(uid, candidates);

  // `claimHandleFor` only owns identity fields. For a profile it just created,
  // carry over the legacy personalisation the user already had in `users/*`;
  // for an existing profile, leave the owner's edits untouched.
  if (!profileSnapBefore.exists) {
    await profileRef.set(
      {
        bio: clampProfileText(userData.bio, PROFILE_BIO_MAX_LENGTH),
        status: userData.status ?? null,
        // `claimHandleFor` cannot parse the legacy ISO-string `createdAt`.
        createdAt: createdAtTimestamp(userData.createdAt, Timestamp),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  // Replaces the old `onLinkedAccountWritten` trigger.
  await syncProfileLinks(uid);

  // Stamped *after* the projection: if the sync throws, `migrationVersion`
  // stays unset, so the next run retries the links-only repair in `main`
  // instead of skipping the user as already ready.
  if (!profileSnapBefore.exists || profileSnapBefore.get('migrationVersion') == null) {
    await profileRef.set({ migrationVersion: 1 }, { merge: true });
  }

  summary.repaired += 1;
  console.log(`[migrate] ${uid}: repaired as @${handle}`);
}

async function main() {
  const admin = await getAdmin();
  if (!admin) {
    console.error('[migrate] Firebase Admin is not configured (FCM_SERVICE_ACCOUNT)');
    process.exitCode = 1;
    return;
  }

  const { FieldValue, Timestamp } = await import('firebase-admin/firestore');
  const db = admin.firestore;

  const usersQuery = ONLY_UID
    ? db.collection('users').where('uid', '==', ONLY_UID)
    : db.collection('users');

  const users = await usersQuery.get();
  const summary = {
    scanned: users.size,
    alreadyReady: 0,
    repaired: 0,
    failed: 0,
    planned: 0,
  };

  for (const userSnap of users.docs) {
    const uid = userSnap.id;
    try {
      const profileSnap = await db.collection('profiles').doc(uid).get();
      if (await isReady(db, uid, profileSnap)) {
        if (profileSnap.get('migrationVersion') != null) {
          summary.alreadyReady += 1;
          continue;
        }

        // Handle contract complete but the stamp is missing: a run can stop
        // between `claimHandleFor` and `syncProfileLinks`, and a profile lazily
        // claimed by the app never gets stamped at all. Repair the projection
        // and stamp, so the user converges instead of being skipped forever.
        if (DRY_RUN) {
          summary.planned += 1;
          console.log(`[migrate] ${uid}: would repair the link projection and stamp`);
          continue;
        }

        await syncProfileLinks(uid);
        await db.collection('profiles').doc(uid).set({ migrationVersion: 1 }, { merge: true });
        summary.repaired += 1;
        console.log(`[migrate] ${uid}: repair link projection only`);
        continue;
      }

      await repairUser(db, FieldValue, Timestamp, uid, userSnap.data() ?? {}, summary);
    } catch (error) {
      summary.failed += 1;
      console.error(`[migrate] ${uid}: failed`, error);
    }
  }

  console.log(
    `[migrate] ${DRY_RUN ? 'dry run' : 'complete'}: scanned=${summary.scanned} ` +
      `ready=${summary.alreadyReady} repaired=${summary.repaired} ` +
      `planned=${summary.planned} failed=${summary.failed}`,
  );

  if (summary.failed > 0) process.exitCode = 1;
}

void main();
