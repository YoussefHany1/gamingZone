/**
 * Social layer: the trusted writes that clients are not allowed to make.
 *
 * Firebase Cloud Functions v2 require the Blaze plan, so the three server-side
 * operations the social layer needs live here instead — this service already
 * runs on the free Vercel deployment the mobile app uses for linked accounts,
 * and it already holds Firebase Admin credentials (`FCM_SERVICE_ACCOUNT`).
 *
 *   POST /social/handle            claim or rename `@handle`
 *   POST /social/links/visibility  toggle one projected linked account
 *   POST /social/links/sync        rebuild `profiles/{uid}.links`
 *
 * `usernames/*` and the identity fields of `profiles/*` stay server-write-only
 * in `firestore.rules`; clients authenticate with a Firebase ID token and never
 * touch either document directly. `syncProfileLinks` is also called by
 * linkedAccounts.js immediately after a link write, which is what replaces the
 * old `onLinkedAccountWritten` Firestore trigger.
 *
 * Error contract: 4xx responses carry a stable machine-readable `code`
 * (`handle_taken`, `handle_reserved`, ...) plus an English message. Clients map
 * the code to a translated string and never display the message.
 */
import { getAdmin } from './firebaseAdmin.js';

// ─── Handle rules ────────────────────────────────────────────────────────────
//
// Mirror of `packages/core/src/social.ts`. The standalone Vercel function is
// deployed from this folder alone, so it cannot import the workspace TS package;
// `social.test.js` pins the same cases as the core test suite. Both sides reject
// invalid input, so a drift can only make the server stricter than a client —
// never the other way round.

export const HANDLE_MIN_LENGTH = 3;
export const HANDLE_MAX_LENGTH = 20;
const HANDLE_PATTERN = /^[a-z0-9_]{3,20}$/;

/** Words a user may not claim: platforms, web-route collisions, staff. */
export const RESERVED_HANDLES = new Set([
  // Platforms
  'steam',
  'xbox',
  'psn',
  'playstation',
  'nintendo',
  'discord',
  'google',
  'apple',
  'epic',
  'epicgames',
  'microsoft',
  'riot',
  'riotgames',
  'battlenet',
  'blizzard',

  // Web route collisions under /u/{handle}
  'u',
  'user',
  'users',
  'chat',
  'chats',
  'social',
  'session',
  'sessions',
  'profile',
  'profiles',
  'admin',
  'api',
  'settings',
  'games',
  'game',
  'news',
  'lists',
  'list',
  'events',
  'event',
  'login',
  'register',
  'auth',
  'signin',
  'signup',
  'about',
  'contact',
  'privacy',
  'terms',
  'support',

  // Impersonation
  'official',
  'staff',
  'mod',
  'moderator',
  'admin_',
  'gamingzone',
  'gaming_zone',
  'gaming-zone',
  'system',
  'root',
]);

/** Platforms whose identifier the public profile may project. */
export const PROFILE_LINK_PLATFORMS = ['steam', 'psn', 'xbox', 'discord'];

/**
 * Fields that may carry the displayable identifier, in priority order.
 * Discord is included for forward compatibility even though today's linked
 * accounts only cover Steam, PSN and Xbox.
 */
export const IDENTIFIER_FIELDS = {
  steam: ['steamId'],
  psn: ['onlineId'],
  xbox: ['gamertag'],
  discord: ['userId', 'id', 'username'],
};

/** Strips a leading `@`, trims, and lowercases. The canonical form. */
export function normalizeHandle(raw) {
  return String(raw ?? '')
    .trim()
    .replace(/^@+/, '')
    .toLowerCase();
}

/**
 * Validates an already-visible-to-the-user handle string and returns the
 * normalised form, so callers never validate one string and store another.
 *
 * @returns {{ ok: true, handle: string } | { ok: false, reason: string }}
 */
export function validateHandle(raw) {
  const handle = normalizeHandle(raw);

  if (handle.length === 0) return { ok: false, reason: 'empty' };
  if (handle.length < HANDLE_MIN_LENGTH || handle.length > HANDLE_MAX_LENGTH) {
    return { ok: false, reason: 'length' };
  }
  if (!HANDLE_PATTERN.test(handle)) return { ok: false, reason: 'charset' };
  if (RESERVED_HANDLES.has(handle)) return { ok: false, reason: 'reserved' };

  return { ok: true, handle };
}

/**
 * Folds a display name into a handle-safe base: accents removed, anything that
 * is not `[a-z0-9_]` collapsed to `_`, trimmed and length-capped.
 *
 * Arabic (or any non-Latin) display name yields an empty string on purpose —
 * callers substitute a neutral base and rely on the uid suffix for uniqueness.
 */
export function slugifyHandleBase(displayName, maxLength = 14) {
  const ascii = String(displayName ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');

  return ascii.slice(0, maxLength).replace(/_+$/g, '');
}

/**
 * Bounded candidate list for auto-generated handles, most natural first.
 *
 * Registration and the migration both need "a handle that is unique without a
 * round-trip" — and both need it to be deterministic, so a retry produces the
 * same answer and the migration converges.
 */
export function handleCandidates(displayName, uid) {
  const safeUid = String(uid ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  const base = slugifyHandleBase(displayName) || 'player';
  const candidates = [];

  // 4, then 6, then 8 characters of uid, then the whole uid.
  for (const length of [4, 6, 8, safeUid.length]) {
    if (length < 4 || length > safeUid.length) continue;
    candidates.push(`${base}_${safeUid.slice(0, length)}`);
  }

  // Numeric fallbacks keep the list finite even for a pathological uid.
  for (let i = 1; i <= 5; i += 1) {
    candidates.push(`${base}_${safeUid.slice(0, 4)}${i}`);
  }

  return Array.from(new Set(candidates)).filter((candidate) => validateHandle(candidate).ok);
}

// ─── Link projection ─────────────────────────────────────────────────────────

export function isProfileLinkPlatform(value) {
  return PROFILE_LINK_PLATFORMS.includes(value);
}

/**
 * Firestore Timestamp | millis → millis or null.
 *
 * Duck-typed rather than `instanceof Timestamp` so the pure helpers stay
 * testable without booting the Admin SDK, and so a Timestamp from another copy
 * of the SDK (Vercel can dedupe differently than the tests do) still works.
 */
export function asMillis(value) {
  if (value && typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return null;
}

/**
 * `firebase-admin/firestore` is imported lazily so a missing credential/dependency
 * degrades the social endpoints to 5xx instead of crashing the whole lambda at
 * boot (same reasoning as firebaseAdmin.js).
 */
let firestoreSdkPromise = null;
function firestoreSdk() {
  if (!firestoreSdkPromise) firestoreSdkPromise = import('firebase-admin/firestore');
  return firestoreSdkPromise;
}

async function loadFirestoreSdk() {
  return firestoreSdk();
}

/**
 * Maps one `linkedAccounts/{platform}` document to its public projection.
 *
 * Returns `null` when the account is not usable: a doc whose status is
 * `unlinked` keeps its identifiers (re-linking does not need a round-trip), so
 * status must win over the presence of `steamId`/`onlineId`/`gamertag`.
 *
 * `visible` is adopted from the previous projection so that re-linking never
 * resets an explicit choice back to the private default.
 */
export function projectLink(platform, data, previous) {
  if (!data || data.status === 'unlinked') return null;

  const identifierField = (IDENTIFIER_FIELDS[platform] ?? []).find(
    (field) => typeof data[field] === 'string' && data[field].trim() !== '',
  );
  if (!identifierField) return null;

  return {
    platform,
    identifier: data[identifierField].trim(),
    visible: previous?.visible ?? false,
    linkedAt: asMillis(data.linkedAt) ?? previous?.linkedAt ?? null,
  };
}

// ─── Errors ──────────────────────────────────────────────────────────────────

/** An error carrying the HTTP status and machine-readable code for the route. */
class SocialError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'SocialError';
    this.status = status;
    this.code = code;
  }
}

function asString(value) {
  return typeof value === 'string' ? value : '';
}

/** Existing timestamps are preserved; a missing one becomes server time. */
function existingTimestamp(value, serverTimestamp) {
  return value && typeof value.toMillis === 'function' ? value : serverTimestamp();
}

async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) {
    throw new SocialError('Social services are not configured', 503, 'not_configured');
  }
  return admin;
}

// ─── Operations ──────────────────────────────────────────────────────────────

/**
 * Claims `handle` for `uid`, creating the profile if it does not exist yet.
 *
 * Both `usernames/*` and the identity fields of `profiles/*` are
 * server-write-only, so this function is the complete surface: it validates,
 * checks the reservation, writes both documents in one transaction, and
 * releases the previous reservation when the user renames.
 *
 * It doubles as profile bootstrap. Registration creates `users/{uid}` only,
 * then calls this with a generated candidate; that keeps registration and
 * renaming on one code path instead of two.
 *
 * @returns {Promise<{ handle: string }>}
 */
export async function claimHandleFor(uid, rawHandle) {
  if (typeof rawHandle !== 'string') {
    throw new SocialError('A handle is required', 400, 'invalid_payload');
  }

  const validation = validateHandle(rawHandle);
  if (!validation.ok) {
    throw validation.reason === 'reserved'
      ? new SocialError('That handle is reserved', 400, 'handle_reserved')
      : new SocialError('Invalid handle', 400, 'handle_invalid');
  }

  const handle = validation.handle;
  const admin = await requireAdmin();
  const { FieldValue } = await loadFirestoreSdk();
  const db = admin.firestore;

  const profileRef = db.collection('profiles').doc(uid);
  const usernameRef = db.collection('usernames').doc(handle);
  const userRef = db.collection('users').doc(uid);

  // Set when this claim bootstraps the profile. Tracked outside the transaction
  // because a retry can abort an attempt after the flag is set — a redundant
  // sync is harmless, a skipped one would leave linked accounts unprojected.
  let createdProfile = false;

  await db.runTransaction(async (transaction) => {
    // All reads first — Firestore requires it, and the reservation check must
    // read the username document before deciding whether it may be claimed.
    const [profileSnap, usernameSnap, userSnap] = await Promise.all([
      transaction.get(profileRef),
      transaction.get(usernameRef),
      transaction.get(userRef),
    ]);

    if (usernameSnap.exists && asString(usernameSnap.get('uid')) !== uid) {
      throw new SocialError('That handle is already taken', 409, 'handle_taken');
    }

    const previousHandle = profileSnap.exists ? asString(profileSnap.get('handleLower')) : '';
    const userData = userSnap.data() ?? {};

    transaction.set(
      usernameRef,
      {
        uid,
        handle,
        createdAt: usernameSnap.exists
          ? existingTimestamp(usernameSnap.get('createdAt'), FieldValue.serverTimestamp)
          : FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    // Only identity fields are decided here. Everything else (banner, bio,
    // status, links, privacy, counts) belongs to the owner or to the projection.
    const profileData = {
      uid,
      handle,
      handleLower: handle,
      displayName:
        (profileSnap.exists
          ? asString(profileSnap.get('displayName'))
          : asString(userData.displayName)) || 'Player',
      photoURL: profileSnap.exists
        ? (profileSnap.get('photoURL') ?? null)
        : (userData.photoURL ?? null),
      platform: profileSnap.exists
        ? asString(profileSnap.get('platform'))
        : asString(userData.platform),
      country: profileSnap.exists
        ? asString(profileSnap.get('country'))
        : asString(userData.country),
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (!profileSnap.exists) {
      createdProfile = true;
      profileData.bannerURL = null;
      profileData.bio = '';
      profileData.status = null;
      profileData.links = {};
      // Mirrors `createDefaultPrivacy()` in `@gaming-zone/core`: discoverable
      // and links on, stats off until the owner opts in.
      profileData.privacy = { discoverable: true, showLinks: true, showStats: false };
      profileData.counts = { friends: 0, sessions: 0 };
      profileData.createdAt = existingTimestamp(userData.createdAt, FieldValue.serverTimestamp);
    }

    transaction.set(profileRef, profileData, { merge: true });

    // Renaming must release the old reservation, otherwise the user's previous
    // handle stays taken forever by an account that no longer answers to it.
    if (previousHandle && previousHandle !== handle) {
      transaction.delete(db.collection('usernames').doc(previousHandle));
    }
  });

  // A user can have linked accounts before their profile exists (e.g. the
  // registration claim failed and the bootstrap runs later). Project them now
  // instead of waiting for the next link write.
  if (createdProfile) {
    try {
      await syncProfileLinks(uid);
    } catch (err) {
      console.warn('[social] initial link projection failed:', err?.message ?? err);
    }
  }

  return { handle };
}

/**
 * Rebuilds `profiles/{uid}.links` from `users/{uid}/linkedAccounts/*`.
 *
 * A missing profile is a no-op: registration/bootstrap creates it, and writing
 * a partial profile here would race `claimHandle` and lose its fields.
 *
 * @returns {Promise<object|null>} the projected links, or null when skipped
 */
export async function syncProfileLinks(uid) {
  const admin = await getAdmin();
  if (!admin) return null;

  const { FieldValue } = await loadFirestoreSdk();
  const db = admin.firestore;

  const profileRef = db.collection('profiles').doc(uid);
  const profileSnap = await profileRef.get();
  if (!profileSnap.exists) return null;

  const linksCollection = db.collection('users').doc(uid).collection('linkedAccounts');
  const refs = PROFILE_LINK_PLATFORMS.map((platform) => linksCollection.doc(platform));
  const snapshots = await db.getAll(...refs);

  const previous = profileSnap.get('links') ?? {};
  const links = {};

  PROFILE_LINK_PLATFORMS.forEach((platform, index) => {
    const snapshot = snapshots[index];
    const next = projectLink(
      platform,
      snapshot?.exists ? snapshot.data() : undefined,
      previous[platform],
    );
    if (next) links[platform] = next;
  });

  // Replace the map (not merge) so an unlinked platform disappears.
  await profileRef.set({ links, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return links;
}

/**
 * Owner-only visibility toggle for one projected link.
 *
 * Exists on the server rather than as an owner-writable `links` map because a
 * map rule cannot prove that `identifier` is unchanged while `visible` flips —
 * the field-level diff is nested one level deeper than `affectedKeys()` sees.
 */
export async function setLinkVisibilityFor(uid, platform, visible) {
  if (!isProfileLinkPlatform(platform) || typeof visible !== 'boolean') {
    throw new SocialError('Invalid payload', 400, 'invalid_payload');
  }

  const admin = await requireAdmin();
  const { FieldValue } = await loadFirestoreSdk();
  const db = admin.firestore;
  const profileRef = db.collection('profiles').doc(uid);

  await db.runTransaction(async (transaction) => {
    const profileSnap = await transaction.get(profileRef);
    if (!profileSnap.exists) {
      throw new SocialError('Linked account not found', 412, 'link_missing');
    }

    const links = { ...(profileSnap.get('links') ?? {}) };
    const existing = links[platform];
    if (!existing) {
      throw new SocialError('Linked account not found', 412, 'link_missing');
    }

    links[platform] = { ...existing, visible };

    transaction.set(
      profileRef,
      { links, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
  });

  return { platform, visible };
}

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * Requires `Authorization: Bearer <Firebase ID token>`; attaches `req.authUid`.
 *
 * Same contract as the linked-accounts middleware: the token's `uid` is the only
 * identity the handler trusts, and `verifyIdToken(token, true)` also rejects
 * revoked sessions.
 */
export function requireAuth(AppError) {
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
      // Server-side visibility: a 401 needs to say WHY in the Vercel logs.
      console.warn('[social] verifyIdToken failed:', err?.code ?? err?.message ?? err);
      return next(new AppError('Invalid or expired session token', 401));
    }
  };
}

/**
 * Mounts the social endpoints. `AppError`/`asyncRoute` are injected by index.js
 * so this module does not import from the entry point (which would be circular).
 */
export function registerSocialRoutes(app, { AppError, asyncRoute }) {
  const auth = requireAuth(AppError);

  /** Converts a SocialError into the shape the central error handler expects. */
  const rethrow = (cause) => {
    if (cause instanceof SocialError) {
      const error = new AppError(cause.message, cause.status);
      error.code = cause.code;
      return error;
    }
    return cause;
  };

  app.post(
    '/social/handle',
    auth,
    asyncRoute(async (req, res) => {
      try {
        const { handle } = await claimHandleFor(req.authUid, req.body?.handle);
        res.setHeader('Cache-Control', 'no-store');
        res.json({ ok: true, handle });
      } catch (cause) {
        throw rethrow(cause);
      }
    }),
  );

  app.post(
    '/social/links/visibility',
    auth,
    asyncRoute(async (req, res) => {
      try {
        const result = await setLinkVisibilityFor(
          req.authUid,
          req.body?.platform,
          req.body?.visible,
        );
        res.setHeader('Cache-Control', 'no-store');
        res.json({ ok: true, ...result });
      } catch (cause) {
        throw rethrow(cause);
      }
    }),
  );

  app.post(
    '/social/links/sync',
    auth,
    asyncRoute(async (req, res) => {
      try {
        const links = await syncProfileLinks(req.authUid);
        res.setHeader('Cache-Control', 'no-store');
        res.json({ ok: true, links: links ?? {} });
      } catch (cause) {
        throw rethrow(cause);
      }
    }),
  );
}
