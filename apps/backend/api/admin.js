/**
 * Admin-only API for the mobile admin dashboard.
 *
 * Every route re-verifies the caller's Firebase ID token and requires the
 * `admin: true` custom claim — the client-side gate in the app is UX only. The
 * Admin SDK bypasses Firestore rules, so all cross-collection reads and the
 * write actions (promote/demote, disable/enable) live here.
 *
 * Read strategy (Firestore cost / latency):
 *   - Totals use `count()` aggregations (1 read per 1,000 index entries), not
 *     full collection scans.
 *   - The signup series and the platform/country distribution come from one
 *     bounded `RECENT_SCAN_CAP` query, and are explicitly flagged
 *     `approximate` when that cap was hit.
 *   - Prefix search relies on the normalized `displayNameLower` / `emailLower`
 *     fields and the composite indexes in `apps/mobile/firestore.indexes.json`.
 *
 * Error contract: `{ message, code }` on 4xx, matching social.js/friends.js.
 */
import { FieldValue } from 'firebase-admin/firestore';
import { getAdmin } from './firebaseAdmin.js';

const AUDIT_COLLECTION = 'adminAuditLogs';
const SEARCH_MIN_LENGTH = 2;
const SEARCH_LIMIT_DEFAULT = 25;
const SEARCH_LIMIT_MAX = 50;
const RECENT_SCAN_CAP = 500;
const RECENT_USERS_LIMIT = 8;
const ONLINE_WINDOW_MS = 5 * 60_000;
const OVERVIEW_CACHE_MS = 45_000;
const DAY_MS = 24 * 60 * 60_000;
const RANGE_KEYS = new Set(['7d', '30d', '90d']);

class AdminError extends Error {
  constructor(message, status = 400, code = 'invalid_request') {
    super(message);
    this.name = 'AdminError';
    this.status = status;
    this.code = code;
  }
}

// ─── Pure helpers (exported for tests) ───────────────────────────────────────

/** Trims, strips a leading `@`, lowercases and caps an admin search term. */
export function normalizeAdminSearch(raw) {
  if (typeof raw !== 'string') return '';
  return raw.trim().replace(/^@+/, '').toLowerCase().slice(0, 80);
}

/** Clamps a `limit` query parameter into `[1, max]`. */
export function parseLimit(raw, fallback = SEARCH_LIMIT_DEFAULT, max = SEARCH_LIMIT_MAX) {
  const value = Number.parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.min(value, max);
}

/** Maps a range key to its start timestamp (ms) and day count. */
export function resolveRange(key, now = Date.now()) {
  const range = RANGE_KEYS.has(key) ? key : '30d';
  const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
  return { range, days, startMs: now - days * DAY_MS, endMs: now };
}

/** Firestore timestamps, millisecond numbers and ISO strings all become ms. */
export function toMillis(value) {
  if (!value) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value.toMillis === 'function') {
    const millis = value.toMillis();
    return Number.isFinite(millis) ? millis : null;
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/** Opaque pagination cursor: the last row's `createdAt` + document id. */
export function encodeCursor(createdAtMillis, id) {
  if (!Number.isFinite(createdAtMillis) || !id) return null;
  return Buffer.from(JSON.stringify({ t: createdAtMillis, id }), 'utf8').toString('base64url');
}

export function decodeCursor(token) {
  if (typeof token !== 'string' || token.length === 0) return null;
  try {
    const parsed = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
    if (!Number.isFinite(parsed?.t) || typeof parsed?.id !== 'string' || !parsed.id) return null;
    return { createdAt: parsed.t, id: parsed.id };
  } catch {
    return null;
  }
}

/**
 * Buckets signup timestamps into consecutive UTC days between `startMs` and
 * `endMs`. Entries outside the window are ignored.
 */
export function buildSignupSeries(timestamps, startMs, endMs) {
  const startDay = Math.floor(startMs / DAY_MS) * DAY_MS;
  const bucketCount = Math.max(1, Math.ceil((endMs - startDay) / DAY_MS));
  const buckets = Array.from({ length: bucketCount }, (_, index) => ({
    date: new Date(startDay + index * DAY_MS).toISOString().slice(0, 10),
    count: 0,
  }));

  for (const timestamp of timestamps) {
    if (!Number.isFinite(timestamp) || timestamp < startMs || timestamp > endMs) continue;
    const index = Math.floor((timestamp - startDay) / DAY_MS);
    if (index >= 0 && index < buckets.length) buckets[index].count += 1;
  }

  return buckets;
}

/** Turns `[{ country }]`-style values into a sorted, capped breakdown. */
export function buildBreakdown(values, limit = 8) {
  const counts = new Map();
  for (const raw of values) {
    const value = typeof raw === 'string' && raw.trim() ? raw.trim() : 'unknown';
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
    .slice(0, limit);
}

/**
 * The whitelist of user-document fields the dashboard may return. `fcmToken`,
 * `linkedAccountSecrets` and any future private fields are never exposed.
 */
export function sanitizeUserRecord(uid, data = {}) {
  return {
    uid,
    displayName: typeof data.displayName === 'string' ? data.displayName : null,
    email: typeof data.email === 'string' ? data.email : null,
    photoURL: typeof data.photoURL === 'string' ? data.photoURL : null,
    country: typeof data.country === 'string' ? data.country : null,
    platform: typeof data.platform === 'string' ? data.platform : null,
    gender: typeof data.gender === 'string' ? data.gender : null,
    dob: typeof data.dob === 'string' ? data.dob : null,
    isAdmin: data.isAdmin === true,
    disabled: data.disabled === true,
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
  };
}

/**
 * Guards a promote/demote target. Throws `AdminError` when the action would
 * lock the dashboard out (self-demotion or removing the final admin).
 */
export function assertAdminRemovalAllowed({ actorUid, targetUid, adminCount }) {
  if (targetUid === actorUid) {
    throw new AdminError('You cannot remove your own admin access', 409, 'self_demotion');
  }
  if (adminCount <= 1) {
    throw new AdminError('At least one admin must remain', 409, 'last_admin');
  }
}

/** Guards disabling an account. */
export function assertDisableAllowed({ actorUid, targetUid }) {
  if (targetUid === actorUid) {
    throw new AdminError('You cannot disable your own account', 409, 'self_disable');
  }
}

function assertUid(value) {
  if (typeof value !== 'string' || !value || value.length > 128 || value.includes('/')) {
    throw new AdminError('Invalid user id', 400, 'invalid_uid');
  }
  return value;
}

function boolBody(value, field) {
  if (typeof value !== 'boolean') {
    throw new AdminError(`\`${field}\` must be a boolean`, 400, 'invalid_payload');
  }
  return value;
}

// ─── Firestore helpers ───────────────────────────────────────────────────────

/** `count()` aggregation, with a safe zero fallback for unsupported paths. */
async function countQuery(query) {
  try {
    const snapshot = await query.count().get();
    const count = snapshot.data()?.count;
    return typeof count === 'number' ? count : 0;
  } catch (error) {
    console.warn('[admin] count() failed:', error?.code ?? error?.message ?? error);
    return 0;
  }
}

async function countWhere(db, path, field, value) {
  return countQuery(db.collection(path).where(field, '==', value));
}

async function writeAudit(db, actor, entry) {
  try {
    await db.collection(AUDIT_COLLECTION).add({
      actorUid: actor.uid,
      actorEmail: actor.email ?? null,
      targetUid: entry.targetUid,
      targetEmail: entry.targetEmail ?? null,
      action: entry.action,
      metadata: entry.metadata ?? {},
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    // An audit-write failure must not silently swallow the action result, but
    // it also must not roll back an Auth change that already succeeded.
    console.warn('[admin] audit write failed:', error?.code ?? error?.message ?? error);
  }
}

// ─── Overview ────────────────────────────────────────────────────────────────

const overviewCache = new Map();

async function loadOverview(db, rangeKey) {
  const cached = overviewCache.get(rangeKey);
  if (cached && Date.now() - cached.generatedAt < OVERVIEW_CACHE_MS) {
    return { ...cached.payload, cached: true };
  }

  const now = Date.now();
  const { range, days, startMs, endMs } = resolveRange(rangeKey, now);
  const onlineSince = now - ONLINE_WINDOW_MS;

  const [
    users,
    profiles,
    admins,
    conversations,
    messages,
    playSessions,
    friendships,
    blockedPairs,
    linkedAccounts,
    onlineNow,
  ] = await Promise.all([
    countQuery(db.collection('users')),
    countQuery(db.collection('profiles')),
    countWhere(db, 'users', 'isAdmin', true),
    countQuery(db.collection('conversations')),
    countQuery(db.collectionGroup('messages')),
    countQuery(db.collection('playSessions')),
    countQuery(db.collection('friendships')),
    countQuery(db.collection('blockedPairs')),
    countQuery(db.collectionGroup('linkedAccounts')),
    countQuery(db.collection('presence').where('updatedAt', '>=', onlineSince)),
  ]);

  // One bounded scan feeds the series, the distributions and the recent list.
  let recentDocs = [];
  try {
    const recentSnap = await db
      .collection('users')
      .orderBy('createdAt', 'desc')
      .limit(RECENT_SCAN_CAP)
      .get();
    recentDocs = recentSnap.docs;
  } catch (error) {
    console.warn('[admin] recent users scan failed:', error?.code ?? error?.message ?? error);
  }

  const rows = recentDocs.map((doc) => sanitizeUserRecord(doc.id, doc.data() ?? {}));
  const sampleSize = rows.length;
  const approximate = sampleSize >= RECENT_SCAN_CAP;

  const signupTimestamps = rows
    .map((row) => row.createdAt)
    .filter((value) => Number.isFinite(value));

  const signupSeries = buildSignupSeries(signupTimestamps, startMs, endMs);
  const newInRange = signupTimestamps.filter((value) => value >= startMs && value <= endMs).length;

  const payload = {
    range,
    days,
    generatedAt: now,
    approximate,
    sampleSize,
    scanCap: RECENT_SCAN_CAP,
    totals: {
      users,
      profiles,
      admins,
      conversations,
      messages,
      playSessions,
      friendships,
      blockedPairs,
      linkedAccounts,
      onlineNow,
    },
    signups: {
      inRange: newInRange,
      approximate,
      series: signupSeries,
    },
    distributions: {
      scope: 'recent_signups',
      approximate,
      sampleSize,
      platforms: buildBreakdown(rows.map((row) => row.platform)),
      countries: buildBreakdown(rows.map((row) => row.country)),
    },
    recentUsers: rows.slice(0, RECENT_USERS_LIMIT),
  };

  overviewCache.set(rangeKey, { generatedAt: now, payload });
  return { ...payload, cached: false };
}

// ─── Users ───────────────────────────────────────────────────────────────────

function looksLikeEmail(value) {
  return typeof value === 'string' && value.includes('@') && !value.startsWith('@');
}

function looksLikeUid(value) {
  return typeof value === 'string' && value.length >= 20 && !value.includes('@');
}

/** Enriches sanitized user rows with Auth metadata. */
async function enrichRows(db, auth, rows) {
  const uids = rows.map((row) => row.uid);
  if (uids.length === 0) return rows;

  const [authResult, profileSnaps] = await Promise.all([
    auth.getUsers(uids.map((uid) => ({ uid }))).catch(() => ({ users: [] })),
    db.getAll(...uids.map((uid) => db.collection('profiles').doc(uid))).catch(() => []),
  ]);

  const authByUid = new Map((authResult?.users ?? []).map((user) => [user.uid, user]));
  const profileByUid = new Map();
  for (const snap of profileSnaps) {
    if (snap?.exists) profileByUid.set(snap.id, snap.data() ?? {});
  }

  return rows.map((row) => {
    const authUser = authByUid.get(row.uid);
    const profile = profileByUid.get(row.uid) ?? {};
    return {
      ...row,
      handle: typeof profile.handle === 'string' ? profile.handle : null,
      profileStatus: typeof profile.status === 'string' ? profile.status : null,
      lastSignIn: authUser?.metadata?.lastSignInTime ?? null,
      createdAuthAt: authUser?.metadata?.creationTime ?? null,
      emailVerified: authUser?.emailVerified ?? false,
      providers: authUser?.providerData?.map((provider) => provider.providerId) ?? [],
      authExists: Boolean(authUser),
    };
  });
}

async function fetchRowsByUids(db, uids) {
  if (uids.length === 0) return [];
  const snaps = await db.getAll(...uids.map((uid) => db.collection('users').doc(uid)));
  return snaps
    .filter((snap) => snap.exists)
    .map((snap) => sanitizeUserRecord(snap.id, snap.data() ?? {}));
}

/** Runs the three prefix queries plus exact-id/email/handle lookups. */
async function searchUsers(db, query, limit) {
  const normalized = normalizeAdminSearch(query);
  if (normalized.length < SEARCH_MIN_LENGTH) {
    return { rows: [], mode: 'none' };
  }

  const uids = new Set();
  const prefixEnd = `${normalized}\uf8ff`;

  if (looksLikeUid(query)) uids.add(query.trim());

  const lookups = [];

  if (looksLikeEmail(normalized)) {
    lookups.push(
      db.collection('users').where('emailLower', '==', normalized).limit(5).get(),
      db.collection('users').where('email', '==', normalized).limit(5).get(),
    );
  }

  const handleSnap = await db
    .collection('usernames')
    .doc(normalized)
    .get()
    .catch(() => null);
  if (handleSnap?.exists && typeof handleSnap.get('uid') === 'string') {
    uids.add(handleSnap.get('uid'));
  }

  lookups.push(
    db
      .collection('users')
      .where('displayNameLower', '>=', normalized)
      .where('displayNameLower', '<=', prefixEnd)
      .orderBy('displayNameLower')
      .limit(limit)
      .get(),
    db
      .collection('users')
      .where('emailLower', '>=', normalized)
      .where('emailLower', '<=', prefixEnd)
      .orderBy('emailLower')
      .limit(limit)
      .get(),
  );

  const snapshots = await Promise.allSettled(lookups);
  for (const result of snapshots) {
    if (result.status !== 'fulfilled') {
      console.warn('[admin] search query failed:', result.reason?.code ?? result.reason?.message);
      continue;
    }
    for (const doc of result.value.docs) uids.add(doc.id);
  }

  const rows = await fetchRowsByUids(db, [...uids]);
  rows.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  return { rows: rows.slice(0, limit), mode: 'search' };
}

async function browseUsers(db, { filter, limit, cursor }) {
  let query = db.collection('users');

  if (filter === 'admins') query = query.where('isAdmin', '==', true);
  if (filter === 'disabled') query = query.where('disabled', '==', true);

  query = query.orderBy('createdAt', 'desc');

  const decoded = decodeCursor(cursor);
  if (decoded) query = query.startAfter(new Date(decoded.createdAt), decoded.id);

  const snap = await query.limit(limit + 1).get();
  const docs = snap.docs.slice(0, limit);
  const rows = docs.map((doc) => sanitizeUserRecord(doc.id, doc.data() ?? {}));
  const last = docs[docs.length - 1];
  const hasMore = snap.docs.length > limit;

  return {
    rows,
    nextCursor: hasMore && last ? encodeCursor(toMillis(last.get('createdAt')), last.id) : null,
    mode: 'browse',
  };
}

// ─── Audit ───────────────────────────────────────────────────────────────────

function sanitizeAudit(doc) {
  const data = doc.data() ?? {};
  return {
    id: doc.id,
    actorUid: typeof data.actorUid === 'string' ? data.actorUid : null,
    actorEmail: typeof data.actorEmail === 'string' ? data.actorEmail : null,
    targetUid: typeof data.targetUid === 'string' ? data.targetUid : null,
    targetEmail: typeof data.targetEmail === 'string' ? data.targetEmail : null,
    action: typeof data.action === 'string' ? data.action : 'unknown',
    metadata: data.metadata && typeof data.metadata === 'object' ? data.metadata : {},
    createdAt: toMillis(data.createdAt),
  };
}

// ─── Route registration ──────────────────────────────────────────────────────

/**
 * Mounts the admin endpoints. `AppError`/`asyncRoute` are injected by index.js
 * to avoid a circular import with the entry point.
 */
export function registerAdminRoutes(app, { AppError, asyncRoute }) {
  const rethrow = (cause) => {
    if (cause instanceof AdminError) {
      const error = new AppError(cause.message, cause.status);
      error.code = cause.code;
      return error;
    }
    return cause;
  };

  const requireAdmin = () => async (req, _res, next) => {
    const admin = await getAdmin();
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;

    if (!token || !admin) {
      return next(new AppError('A Firebase ID token is required', 401));
    }

    let decoded;
    try {
      decoded = await admin.auth.verifyIdToken(token, true);
    } catch (error) {
      console.warn('[admin] verifyIdToken failed:', error?.code ?? error?.message ?? error);
      return next(new AppError('Invalid or expired session token', 401));
    }

    if (decoded.admin !== true) {
      const error = new AppError('Admin access required', 403);
      error.code = 'admin_required';
      return next(error);
    }

    req.adminUid = decoded.uid;
    req.adminEmail = decoded.email ?? null;
    req.adminClaims = decoded;
    next();
  };

  const auth = requireAdmin();

  const withAdmin = async () => {
    const admin = await getAdmin();
    if (!admin) {
      throw new AppError('Admin API is not configured on this server', 503);
    }
    return admin;
  };

  const send = (res, payload) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json(payload);
  };

  app.get(
    '/admin/me',
    auth,
    asyncRoute(async (req, res) => {
      send(res, {
        ok: true,
        uid: req.adminUid,
        email: req.adminEmail,
        isAdmin: true,
        serverTime: Date.now(),
      });
    }),
  );

  app.get(
    '/admin/overview',
    auth,
    asyncRoute(async (req, res) => {
      try {
        const { firestore: db } = await withAdmin();
        const overview = await loadOverview(db, req.query?.range);
        send(res, { ok: true, ...overview });
      } catch (cause) {
        throw rethrow(cause);
      }
    }),
  );

  app.get(
    '/admin/users',
    auth,
    asyncRoute(async (req, res) => {
      try {
        const { firestore: db, auth: adminAuth } = await withAdmin();
        const limit = parseLimit(req.query?.limit);
        const filter = ['all', 'admins', 'disabled'].includes(req.query?.filter)
          ? req.query.filter
          : 'all';
        const query = typeof req.query?.query === 'string' ? req.query.query : '';

        let result;
        try {
          result =
            normalizeAdminSearch(query).length >= SEARCH_MIN_LENGTH
              ? await searchUsers(db, query, limit)
              : await browseUsers(db, { filter, limit, cursor: req.query?.cursor });
        } catch (error) {
          // A missing composite index surfaces as FAILED_PRECONDITION. Browse
          // without the index-backed ordering rather than returning a 500.
          if (error?.code === 9 || /index/i.test(error?.message ?? '')) {
            const fallback = await db.collection('users').limit(limit).get();
            result = {
              rows: fallback.docs.map((doc) => sanitizeUserRecord(doc.id, doc.data() ?? {})),
              nextCursor: null,
              mode: 'fallback',
            };
          } else {
            throw error;
          }
        }

        const users = await enrichRows(db, adminAuth, result.rows);
        send(res, {
          ok: true,
          mode: result.mode,
          filter,
          limit,
          nextCursor: result.nextCursor ?? null,
          users,
        });
      } catch (cause) {
        throw rethrow(cause);
      }
    }),
  );

  app.get(
    '/admin/users/:uid',
    auth,
    asyncRoute(async (req, res) => {
      try {
        const uid = assertUid(req.params?.uid);
        const { firestore: db, auth: adminAuth } = await withAdmin();

        const [userSnap, profileSnap, linkedSnap, adminAuthUser] = await Promise.all([
          db.collection('users').doc(uid).get(),
          db.collection('profiles').doc(uid).get().catch(() => null),
          db
            .collection('users')
            .doc(uid)
            .collection('linkedAccounts')
            .get()
            .catch(() => null),
          adminAuth.getUser(uid).catch(() => null),
        ]);

        if (!userSnap.exists && !adminAuthUser) {
          throw new AdminError('User not found', 404, 'user_not_found');
        }

        const [lists, ratings, friends, conversations, sessions] = await Promise.all([
          countQuery(db.collection('users').doc(uid).collection('lists')),
          countQuery(db.collection('users').doc(uid).collection('ratings')),
          countQuery(db.collection('friendships').where('members', 'array-contains', uid)),
          countQuery(db.collection('conversations').where('members', 'array-contains', uid)),
          countQuery(db.collection('playSessions').where('participantUids', 'array-contains', uid)),
        ]);

        let recentAudit = [];
        try {
          const auditSnap = await db
            .collection(AUDIT_COLLECTION)
            .where('targetUid', '==', uid)
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();
          recentAudit = auditSnap.docs.map(sanitizeAudit);
        } catch {
          recentAudit = [];
        }

        const profile = profileSnap?.exists ? profileSnap.data() ?? {} : {};
        const linkedAccounts = (linkedSnap?.docs ?? []).map((doc) => {
          const data = doc.data() ?? {};
          return {
            platform: typeof data.platform === 'string' ? data.platform : doc.id,
            status: typeof data.status === 'string' ? data.status : null,
            linkedAt: toMillis(data.linkedAt),
            lastSyncedAt: toMillis(data.lastSyncedAt),
          };
        });

        const user = sanitizeUserRecord(uid, userSnap.data() ?? {});

        send(res, {
          ok: true,
          user: {
            ...user,
            handle: typeof profile.handle === 'string' ? profile.handle : null,
            bio: typeof profile.bio === 'string' ? profile.bio : null,
            bannerURL: typeof profile.bannerURL === 'string' ? profile.bannerURL : null,
            profileStatus: typeof profile.status === 'string' ? profile.status : null,
            profileCreatedAt: toMillis(profile.createdAt),
          },
          auth: adminAuthUser
            ? {
                exists: true,
                disabled: adminAuthUser.disabled,
                emailVerified: adminAuthUser.emailVerified,
                lastSignIn: adminAuthUser.metadata?.lastSignInTime ?? null,
                createdAuthAt: adminAuthUser.metadata?.creationTime ?? null,
                providers: adminAuthUser.providerData?.map((provider) => provider.providerId) ?? [],
                customClaims: {
                  admin: adminAuthUser.customClaims?.admin === true,
                },
              }
            : { exists: false },
          linkedAccounts,
          counts: { lists, ratings, friends, conversations, sessions },
          recentAudit,
        });
      } catch (cause) {
        throw rethrow(cause);
      }
    }),
  );

  app.post(
    '/admin/users/:uid/admin',
    auth,
    asyncRoute(async (req, res) => {
      try {
        const uid = assertUid(req.params?.uid);
        const enabled = boolBody(req.body?.enabled, 'enabled');
        const { firestore: db, auth: adminAuth } = await withAdmin();
        const actor = { uid: req.adminUid, email: req.adminEmail };

        if (!enabled) {
          const adminCount = await countWhere(db, 'users', 'isAdmin', true);
          assertAdminRemovalAllowed({ actorUid: actor.uid, targetUid: uid, adminCount });
        }

        const target = await adminAuth.getUser(uid);
        const claims = { ...(target.customClaims ?? {}) };

        if (enabled) claims.admin = true;
        else delete claims.admin;

        await adminAuth.setCustomUserClaims(uid, claims);
        await adminAuth.revokeRefreshTokens(uid);

        const userRef = db.collection('users').doc(uid);
        const userSnap = await userRef.get();
        if (userSnap.exists) {
          await userRef.set(
            { isAdmin: enabled, updatedAt: FieldValue.serverTimestamp() },
            { merge: true },
          );
        }

        await writeAudit(db, actor, {
          targetUid: uid,
          targetEmail: target.email ?? null,
          action: enabled ? 'promote' : 'demote',
        });

        send(res, { ok: true, uid, isAdmin: enabled });
      } catch (cause) {
        if (cause?.code === 'auth/user-not-found') {
          const error = new AppError('User not found', 404);
          error.code = 'user_not_found';
          throw error;
        }
        throw rethrow(cause);
      }
    }),
  );

  app.post(
    '/admin/users/:uid/disabled',
    auth,
    asyncRoute(async (req, res) => {
      try {
        const uid = assertUid(req.params?.uid);
        const disabled = boolBody(req.body?.disabled, 'disabled');
        const { firestore: db, auth: adminAuth } = await withAdmin();
        const actor = { uid: req.adminUid, email: req.adminEmail };

        if (disabled) assertDisableAllowed({ actorUid: actor.uid, targetUid: uid });

        const target = await adminAuth.getUser(uid);
        await adminAuth.updateUser(uid, { disabled });
        if (disabled) await adminAuth.revokeRefreshTokens(uid);

        const userRef = db.collection('users').doc(uid);
        const userSnap = await userRef.get();
        if (userSnap.exists) {
          await userRef.set(
            { disabled, updatedAt: FieldValue.serverTimestamp() },
            { merge: true },
          );
        }

        await writeAudit(db, actor, {
          targetUid: uid,
          targetEmail: target.email ?? null,
          action: disabled ? 'disable' : 'enable',
        });

        send(res, { ok: true, uid, disabled });
      } catch (cause) {
        if (cause?.code === 'auth/user-not-found') {
          const error = new AppError('User not found', 404);
          error.code = 'user_not_found';
          throw error;
        }
        throw rethrow(cause);
      }
    }),
  );

  app.get(
    '/admin/audit',
    auth,
    asyncRoute(async (req, res) => {
      try {
        const { firestore: db } = await withAdmin();
        const limit = parseLimit(req.query?.limit, 50, 100);
        const snap = await db
          .collection(AUDIT_COLLECTION)
          .orderBy('createdAt', 'desc')
          .limit(limit)
          .get();
        send(res, { ok: true, entries: snap.docs.map(sanitizeAudit) });
      } catch (cause) {
        throw rethrow(cause);
      }
    }),
  );
}

export { AdminError };
