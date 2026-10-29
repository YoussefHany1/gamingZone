/**
 * Friends: requests, accept/decline, unfriend, blocking and handle search.
 *
 * These are trusted writes: `friendRequests/*`, `friendships/*`,
 * `blockedPairs/*` and `blocks/*` are all `write: false` in firestore.rules, so
 * the client can only read its own rows and ask this module to change them.
 * That is deliberate — a client-writable friendship would let either party
 * forge the other's consent.
 *
 * Mirrors of `packages/core/src/social.ts` (pair ids + search normalisation)
 * live here because the Vercel folder deploys standalone and cannot import the
 * workspace package. `friends.test.js` pins them against the core behaviour.
 *
 *   POST /social/friends/request   { uid | handle }
 *   POST /social/friends/respond   { from, action: 'accept' | 'decline' }
 *   POST /social/friends/cancel    { to }
 *   POST /social/friends/remove    { uid }
 *   POST /social/blocks            { uid, action: 'block' | 'unblock' }
 *   GET  /social/search?q=         handle-prefix search, discovery + blocks
 *
 * Error codes: `invalid_payload`, `cannot_friend_self`, `user_not_found`,
 * `blocked`, `already_friends`, `request_resolved`, `not_blocker`.
 */
import { getAdmin } from './firebaseAdmin.js';
import { sendFriendRequestPush } from './push.js';
import { requireAuth } from './social.js';

// ─── Pure helpers (mirror of `packages/core/src/social.ts`) ──────────────────

export const PROFILE_SEARCH_MIN_LENGTH = 2;
export const PROFILE_SEARCH_LIMIT = 20;
const PROFILE_SEARCH_MAX_LENGTH = 30;

/** Firebase uids are alphanumeric, so `_` is a safe pair separator. */
export function sortPair(uidA, uidB) {
  return uidA < uidB ? [uidA, uidB] : [uidB, uidA];
}

export function friendshipId(uidA, uidB) {
  const [first, second] = sortPair(uidA, uidB);
  return `${first}_${second}`;
}

export function blockedPairId(uidA, uidB) {
  return friendshipId(uidA, uidB);
}

/** Directional on purpose: A→B and B→A are two documents. */
export function friendRequestId(from, to) {
  return `${from}_${to}`;
}

export function normalizeProfileSearch(raw) {
  if (typeof raw !== 'string') return '';
  return raw.trim().replace(/^@+/, '').toLowerCase().slice(0, PROFILE_SEARCH_MAX_LENGTH);
}

function isUid(value) {
  return (
    typeof value === 'string' && value.length > 0 && value.length <= 128 && !value.includes('/')
  );
}

// ─── Errors ──────────────────────────────────────────────────────────────────

class FriendError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'FriendError';
    this.status = status;
    this.code = code;
  }
}

function invalid(message = 'Invalid payload') {
  return new FriendError(message, 400, 'invalid_payload');
}

// ─── Admin helpers ───────────────────────────────────────────────────────────

let firestoreSdkPromise = null;
function loadFirestoreSdk() {
  if (!firestoreSdkPromise) firestoreSdkPromise = import('firebase-admin/firestore');
  return firestoreSdkPromise;
}

async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) {
    throw new FriendError('Social services are not configured', 503, 'not_configured');
  }
  return admin;
}

function asString(value) {
  return typeof value === 'string' ? value : '';
}

function asCount(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

/**
 * Resolves `{ uid }` or `{ handle }` to a uid inside a transaction.
 *
 * A handle is read through `usernames/{handle}` (the same reservation the claim
 * writes), so a rename between the client seeing a search result and tapping
 * "Add" resolves to the current owner or fails cleanly.
 */
async function resolveTargetUid(transaction, db, target, selfUid) {
  let uid = '';

  if (target && typeof target.uid === 'string') {
    uid = target.uid.trim();
  } else if (target && typeof target.handle === 'string') {
    const handle = normalizeProfileSearch(target.handle);
    if (!handle) throw invalid();
    const snap = await transaction.get(db.collection('usernames').doc(handle));
    uid = snap.exists ? asString(snap.get('uid')) : '';
  }

  if (!isUid(uid)) throw new FriendError('User not found', 404, 'user_not_found');
  if (uid === selfUid) throw new FriendError('You cannot add yourself', 400, 'cannot_friend_self');
  return uid;
}

/** Sets a friendship active and keeps both public friend counts in step. */
function writeFriendship(transaction, FieldValue, refs, members, profileSnaps, active) {
  const now = FieldValue.serverTimestamp();
  const wasActive = refs.friendshipSnap.exists && refs.friendshipSnap.get('status') === 'active';

  transaction.set(
    refs.friendshipRef,
    {
      members,
      status: active ? 'active' : 'ended',
      createdAt:
        refs.friendshipSnap.exists && refs.friendshipSnap.get('createdAt')
          ? refs.friendshipSnap.get('createdAt')
          : now,
      endedAt: active ? null : now,
    },
    { merge: true },
  );

  if (wasActive === active) return;

  // Counts are stored as plain numbers so a profile read never needs an
  // aggregation. Both profile snapshots are read by the caller in the same
  // transaction, so the increment cannot race another friendship change.
  const delta = active ? 1 : -1;
  [refs.selfUid, refs.otherUid].forEach((uid, index) => {
    const snap = profileSnaps[index];
    const current = snap?.exists ? asCount(snap.get('counts')?.friends) : 0;
    transaction.set(
      refs.db.collection('profiles').doc(uid),
      { counts: { friends: Math.max(0, current + delta) } },
      { merge: true },
    );
  });
}

// ─── Operations ──────────────────────────────────────────────────────────────

/**
 * Sends a friend request, or auto-accepts when the target already asked.
 *
 * Idempotent: a second call while a request is pending returns the same
 * `pending` result without writing, and a declined/cancelled request can be
 * re-sent (the document is reused, keeping a single row per direction).
 *
 * @returns {Promise<{ status: 'pending' | 'accepted' }>}
 */
export async function sendFriendRequest(uid, target) {
  if (!isUid(uid)) throw invalid();
  if (!target || (typeof target.uid !== 'string' && typeof target.handle !== 'string')) {
    throw invalid();
  }

  const admin = await requireAdmin();
  const { FieldValue } = await loadFirestoreSdk();
  const db = admin.firestore;

  const result = await db.runTransaction(async (transaction) => {
    const targetUid = await resolveTargetUid(transaction, db, target, uid);
    const members = sortPair(uid, targetUid);

    const refs = {
      db,
      selfUid: uid,
      otherUid: targetUid,
      friendshipRef: db.collection('friendships').doc(friendshipId(uid, targetUid)),
      blockedRef: db.collection('blockedPairs').doc(blockedPairId(uid, targetUid)),
      ownRequestRef: db.collection('friendRequests').doc(friendRequestId(uid, targetUid)),
      reverseRequestRef: db.collection('friendRequests').doc(friendRequestId(targetUid, uid)),
    };

    const [
      targetProfileSnap,
      selfProfileSnap,
      blockedSnap,
      friendshipSnap,
      ownRequestSnap,
      reverseRequestSnap,
    ] = await Promise.all([
      transaction.get(db.collection('profiles').doc(targetUid)),
      transaction.get(db.collection('profiles').doc(uid)),
      transaction.get(refs.blockedRef),
      transaction.get(refs.friendshipRef),
      transaction.get(refs.ownRequestRef),
      transaction.get(refs.reverseRequestRef),
    ]);

    if (!targetProfileSnap.exists) {
      throw new FriendError('User not found', 404, 'user_not_found');
    }
    if (blockedSnap.exists) throw new FriendError('Blocked', 403, 'blocked');
    if (friendshipSnap.exists && friendshipSnap.get('status') === 'active') {
      throw new FriendError('Already friends', 409, 'already_friends');
    }

    refs.friendshipSnap = friendshipSnap;
    const profileSnaps = [selfProfileSnap, targetProfileSnap];

    // Crossed requests: both sides already said yes, so finish the handshake
    // instead of leaving two pending rows that each wait for the other.
    if (reverseRequestSnap.exists && reverseRequestSnap.get('status') === 'pending') {
      const now = FieldValue.serverTimestamp();
      writeFriendship(transaction, FieldValue, refs, members, profileSnaps, true);
      transaction.set(
        refs.reverseRequestRef,
        { status: 'accepted', respondedAt: now },
        { merge: true },
      );
      transaction.set(
        refs.ownRequestRef,
        {
          from: uid,
          to: targetUid,
          status: 'accepted',
          createdAt: ownRequestSnap.exists ? ownRequestSnap.get('createdAt') : now,
          respondedAt: now,
        },
        { merge: true },
      );
      return { status: 'accepted', targetUid };
    }

    if (ownRequestSnap.exists && ownRequestSnap.get('status') === 'pending') {
      return { status: 'pending', targetUid };
    }

    transaction.set(refs.ownRequestRef, {
      from: uid,
      to: targetUid,
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
      respondedAt: null,
    });

    return { status: 'pending', targetUid };
  });

  // Best-effort push: the request is already durable, and a notification
  // failure must not turn a successful write into a client error.
  try {
    await sendFriendRequestPush({
      fromUid: uid,
      toUid: result.targetUid,
      autoAccepted: result.status === 'accepted',
    });
  } catch (error) {
    console.warn('[friends] request push failed:', error?.message ?? error);
  }

  return { status: result.status };
}

/** Accepts or declines an incoming request. Only the recipient may respond. */
export async function respondFriendRequest(uid, fromUid, action) {
  if (!isUid(uid) || !isUid(fromUid) || fromUid === uid) throw invalid();
  if (action !== 'accept' && action !== 'decline') throw invalid();

  const admin = await requireAdmin();
  const { FieldValue } = await loadFirestoreSdk();
  const db = admin.firestore;

  const result = await db.runTransaction(async (transaction) => {
    const requestRef = db.collection('friendRequests').doc(friendRequestId(fromUid, uid));
    const friendshipRef = db.collection('friendships').doc(friendshipId(uid, fromUid));
    const blockedRef = db.collection('blockedPairs').doc(blockedPairId(uid, fromUid));

    const [requestSnap, friendshipSnap, blockedSnap, selfProfileSnap, fromProfileSnap] =
      await Promise.all([
        transaction.get(requestRef),
        transaction.get(friendshipRef),
        transaction.get(blockedRef),
        transaction.get(db.collection('profiles').doc(uid)),
        transaction.get(db.collection('profiles').doc(fromUid)),
      ]);

    if (!requestSnap.exists) {
      throw new FriendError('Request not found', 404, 'request_not_found');
    }
    if (requestSnap.get('status') !== 'pending') {
      throw new FriendError('Request already resolved', 409, 'request_resolved');
    }
    if (blockedSnap.exists) throw new FriendError('Blocked', 403, 'blocked');

    const now = FieldValue.serverTimestamp();

    if (action === 'decline') {
      transaction.set(requestRef, { status: 'declined', respondedAt: now }, { merge: true });
      return { status: 'declined' };
    }

    writeFriendship(
      transaction,
      FieldValue,
      {
        db,
        selfUid: uid,
        otherUid: fromUid,
        friendshipRef,
        friendshipSnap,
      },
      sortPair(uid, fromUid),
      [selfProfileSnap, fromProfileSnap],
      true,
    );
    transaction.set(requestRef, { status: 'accepted', respondedAt: now }, { merge: true });
    return { status: 'accepted' };
  });

  if (result.status === 'accepted') {
    try {
      await sendFriendRequestPush({
        fromUid: uid,
        toUid: fromUid,
        autoAccepted: true,
      });
    } catch (error) {
      console.warn('[friends] accept push failed:', error?.message ?? error);
    }
  }

  return result;
}

/**
 * Cancels the caller's own outgoing request. Idempotent — a request that was
 * already answered simply reports `cancelled` without touching history.
 */
export async function cancelFriendRequest(uid, toUid) {
  if (!isUid(uid) || !isUid(toUid) || toUid === uid) throw invalid();

  const admin = await requireAdmin();
  const { FieldValue } = await loadFirestoreSdk();
  const db = admin.firestore;
  const requestRef = db.collection('friendRequests').doc(friendRequestId(uid, toUid));

  await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(requestRef);
    if (!snap.exists || snap.get('status') !== 'pending') return;
    transaction.set(
      requestRef,
      { status: 'cancelled', respondedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
  });

  return { status: 'cancelled' };
}

/**
 * Ends a friendship. Never deletes the document: message threads, cursors and
 * the audit trail all depend on it staying resolvable.
 */
export async function unfriend(uid, otherUid) {
  if (!isUid(uid) || !isUid(otherUid) || otherUid === uid) throw invalid();

  const admin = await requireAdmin();
  const { FieldValue } = await loadFirestoreSdk();
  const db = admin.firestore;

  const status = await db.runTransaction(async (transaction) => {
    const friendshipRef = db.collection('friendships').doc(friendshipId(uid, otherUid));
    const [friendshipSnap, selfProfileSnap, otherProfileSnap] = await Promise.all([
      transaction.get(friendshipRef),
      transaction.get(db.collection('profiles').doc(uid)),
      transaction.get(db.collection('profiles').doc(otherUid)),
    ]);

    if (!friendshipSnap.exists || friendshipSnap.get('status') !== 'active') return 'none';

    writeFriendship(
      transaction,
      FieldValue,
      {
        db,
        selfUid: uid,
        otherUid,
        friendshipRef,
        friendshipSnap,
      },
      sortPair(uid, otherUid),
      [selfProfileSnap, otherProfileSnap],
      false,
    );
    return 'ended';
  });

  return { status };
}

/**
 * Blocks another user.
 *
 * One `blockedPairs` document makes the block symmetric for reads (the rules
 * check it), while `blocks/{uid}/uids/{other}` is what the blocker's "blocked
 * users" screen lists. Only the original blocker can undo it (`unblockUser`).
 */
export async function blockUser(uid, otherUid) {
  if (!isUid(uid) || !isUid(otherUid) || otherUid === uid) {
    throw invalid('You cannot block yourself');
  }

  const admin = await requireAdmin();
  const { FieldValue } = await loadFirestoreSdk();
  const db = admin.firestore;

  await db.runTransaction(async (transaction) => {
    const blockedRef = db.collection('blockedPairs').doc(blockedPairId(uid, otherUid));
    const blockListRef = db.collection('blocks').doc(uid).collection('uids').doc(otherUid);
    const friendshipRef = db.collection('friendships').doc(friendshipId(uid, otherUid));
    const outgoingRef = db.collection('friendRequests').doc(friendRequestId(uid, otherUid));
    const incomingRef = db.collection('friendRequests').doc(friendRequestId(otherUid, uid));

    const [
      blockedSnap,
      friendshipSnap,
      outgoingSnap,
      incomingSnap,
      selfProfileSnap,
      otherProfileSnap,
    ] = await Promise.all([
      transaction.get(blockedRef),
      transaction.get(friendshipRef),
      transaction.get(outgoingRef),
      transaction.get(incomingRef),
      transaction.get(db.collection('profiles').doc(uid)),
      transaction.get(db.collection('profiles').doc(otherUid)),
    ]);

    // Already blocked by someone (possibly the other party): leave `blockedBy`
    // alone, but make sure the caller's own list entry exists.
    if (!blockedSnap.exists) {
      transaction.set(blockedRef, {
        uids: sortPair(uid, otherUid),
        blockedBy: uid,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
    transaction.set(blockListRef, { createdAt: FieldValue.serverTimestamp() });

    if (friendshipSnap.exists && friendshipSnap.get('status') === 'active') {
      writeFriendship(
        transaction,
        FieldValue,
        {
          db,
          selfUid: uid,
          otherUid,
          friendshipRef,
          friendshipSnap,
        },
        sortPair(uid, otherUid),
        [selfProfileSnap, otherProfileSnap],
        false,
      );
    }

    const now = FieldValue.serverTimestamp();
    [outgoingRef, incomingRef].forEach((ref, index) => {
      const snap = index === 0 ? outgoingSnap : incomingSnap;
      if (snap.exists && snap.get('status') === 'pending') {
        transaction.set(ref, { status: 'cancelled', respondedAt: now }, { merge: true });
      }
    });
  });

  return { blocked: true };
}

/** Removes the caller's block. Only the blocker may unblock. */
export async function unblockUser(uid, otherUid) {
  if (!isUid(uid) || !isUid(otherUid) || otherUid === uid) throw invalid();

  const admin = await requireAdmin();
  const db = admin.firestore;
  const blockedRef = db.collection('blockedPairs').doc(blockedPairId(uid, otherUid));

  await db.runTransaction(async (transaction) => {
    const blockedSnap = await transaction.get(blockedRef);
    if (!blockedSnap.exists) return;

    if (asString(blockedSnap.get('blockedBy')) !== uid) {
      throw new FriendError('Only the blocker can unblock', 403, 'not_blocker');
    }

    // A block is a state, not a message: removing the pair document is what
    // restores the symmetric read access both sides had before.
    transaction.delete(blockedRef);
    transaction.delete(db.collection('blocks').doc(uid).collection('uids').doc(otherUid));
  });

  return { blocked: false };
}

/**
 * Handle-prefix search among discoverable profiles.
 *
 * Runs with Admin SDK privileges because `profiles` has no client `list` rule
 * (a query rule cannot enforce symmetric blocking). Results are filtered here
 * for self and for either party's blocks. The `profiles(privacy.discoverable,
 * handleLower)` index serves the range.
 *
 * @returns {Promise<{ results: object[] }>}
 */
export async function searchProfiles(uid, rawQuery) {
  if (!isUid(uid)) throw invalid();
  const query = normalizeProfileSearch(rawQuery);
  if (query.length < PROFILE_SEARCH_MIN_LENGTH) return { results: [] };

  const admin = await requireAdmin();
  const db = admin.firestore;

  const snapshot = await db
    .collection('profiles')
    .where('privacy.discoverable', '==', true)
    .orderBy('handleLower')
    .startAt(query)
    .endAt(`${query}\uf8ff`)
    .limit(PROFILE_SEARCH_LIMIT + 1)
    .get();

  const candidates = snapshot.docs.filter((doc) => doc.id !== uid).slice(0, PROFILE_SEARCH_LIMIT);

  if (candidates.length === 0) return { results: [] };

  const blockRefs = candidates.map((doc) =>
    db.collection('blockedPairs').doc(blockedPairId(uid, doc.id)),
  );
  const blockSnaps = await db.getAll(...blockRefs);

  return {
    results: candidates
      .filter((_, index) => !blockSnaps[index].exists)
      .map((doc) => {
        const data = doc.data() ?? {};
        return {
          uid: doc.id,
          handle: asString(data.handle),
          displayName: asString(data.displayName) || 'Player',
          photoURL: typeof data.photoURL === 'string' ? data.photoURL : null,
          platform: asString(data.platform),
          country: asString(data.country),
        };
      }),
  };
}

// ─── Routes ──────────────────────────────────────────────────────────────────

export function registerFriendRoutes(app, { AppError, asyncRoute }) {
  const auth = requireAuth(AppError);
  const rethrow = (cause) => {
    if (cause instanceof FriendError) {
      const error = new AppError(cause.message, cause.status);
      error.code = cause.code;
      return error;
    }
    return cause;
  };

  /** Registration helper: keeps the five write endpoints identical. */
  const post = (path, handler) => {
    app.post(
      path,
      auth,
      asyncRoute(async (req, res) => {
        try {
          const result = await handler(req);
          res.setHeader('Cache-Control', 'no-store');
          res.json({ ok: true, ...result });
        } catch (cause) {
          throw rethrow(cause);
        }
      }),
    );
  };

  post('/social/friends/request', (req) =>
    sendFriendRequest(req.authUid, {
      uid: req.body?.uid,
      handle: req.body?.handle,
    }),
  );

  post('/social/friends/respond', (req) =>
    respondFriendRequest(req.authUid, req.body?.from, req.body?.action),
  );

  post('/social/friends/cancel', (req) => cancelFriendRequest(req.authUid, req.body?.to));

  post('/social/friends/remove', (req) => unfriend(req.authUid, req.body?.uid));

  post('/social/blocks', (req) => {
    const action = req.body?.action;
    if (action === 'block') return blockUser(req.authUid, req.body?.uid);
    if (action === 'unblock') return unblockUser(req.authUid, req.body?.uid);
    throw invalid();
  });

  app.get(
    '/social/search',
    auth,
    asyncRoute(async (req, res) => {
      try {
        const { results } = await searchProfiles(req.authUid, req.query?.q);
        res.setHeader('Cache-Control', 'no-store');
        res.json({ ok: true, results });
      } catch (cause) {
        throw rethrow(cause);
      }
    }),
  );
}
