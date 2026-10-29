/**
 * FCM delivery for the social layer, server-side.
 *
 * Reads the multi-device `users/{uid}.fcmTokens` map (Phase 1) and falls back to
 * the legacy single-device `fcmToken` while older accounts are still around.
 * Tokens FCM reports as invalid are pruned from the map, so a reinstall does
 * not leave a dead entry behind.
 *
 * Every caller treats push as best-effort: the Firestore write that produced
 * the notification is already durable, so a delivery failure is logged, never
 * surfaced as a failed friend request.
 */
import { getAdmin } from './firebaseAdmin.js';
import { friendAcceptedMessage, friendRequestMessage } from './i18n.js';

/** Android channel the mobile app creates on first launch. */
export const SOCIAL_CHANNEL_ID = 'social_notifications';

const MAX_TOKENS_PER_REQUEST = 500;

let messagingSdkPromise = null;
function loadMessagingSdk() {
  if (!messagingSdkPromise) messagingSdkPromise = import('firebase-admin/messaging');
  return messagingSdkPromise;
}

function asString(value) {
  return typeof value === 'string' ? value : '';
}

/**
 * @typedef {{ id: string | null, token: string }} TokenEntry
 * `id` is the `fcmTokens` map key, or null for the legacy field.
 */

/** @returns {TokenEntry[]} */
function collectTokens(userData) {
  const entries = [];
  const map = userData?.fcmTokens;
  if (map && typeof map === 'object') {
    for (const [id, value] of Object.entries(map)) {
      const token = asString(value?.token).trim();
      if (token) entries.push({ id, token });
    }
  }

  const legacy = asString(userData?.fcmToken).trim();
  if (legacy && !entries.some((entry) => entry.token === legacy)) {
    entries.push({ id: null, token: legacy });
  }

  return entries;
}

const INVALID_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
]);

/**
 * Sends one notification to every device of every uid in `uids`.
 *
 * @param {string[]} uids
 * @param {{ title: string, body: string, data?: Record<string, string> }} payload
 * @returns {Promise<{ sent: number, failed: number }>}
 */
export async function sendPushToUids(uids, payload) {
  const admin = await getAdmin();
  if (!admin) return { sent: 0, failed: 0 };

  const recipients = Array.from(new Set(uids.filter((uid) => typeof uid === 'string' && uid)));
  if (recipients.length === 0) return { sent: 0, failed: 0 };

  const userRefs = recipients.map((uid) => admin.firestore.collection('users').doc(uid));
  const snapshots = await admin.firestore.getAll(...userRefs);

  /** Every token with the account it belongs to, so pruning is possible. */
  const targets = [];
  snapshots.forEach((snapshot, index) => {
    if (!snapshot.exists) return;
    const userData = snapshot.data() ?? {};
    // Social notifications are on by default; an explicit `false` opts out.
    if (userData.notificationPrefs?.social === false) return;
    for (const entry of collectTokens(userData)) {
      targets.push({ uid: recipients[index], ...entry });
    }
  });

  if (targets.length === 0) return { sent: 0, failed: 0 };

  const { getMessaging } = await loadMessagingSdk();
  const messaging = getMessaging(admin.app);

  let sent = 0;
  let failed = 0;
  const invalid = [];

  for (let start = 0; start < targets.length; start += MAX_TOKENS_PER_REQUEST) {
    const chunk = targets.slice(start, start + MAX_TOKENS_PER_REQUEST);
    const response = await messaging.sendEachForMulticast({
      tokens: chunk.map((target) => target.token),
      notification: { title: payload.title, body: payload.body },
      data: payload.data ?? {},
      android: {
        priority: 'high',
        notification: { channelId: SOCIAL_CHANNEL_ID },
      },
      apns: {
        payload: { aps: { sound: 'default', badge: 1 } },
      },
    });

    response.responses.forEach((result, index) => {
      if (result.success) {
        sent += 1;
        return;
      }
      failed += 1;
      const code = result.error?.code ?? '';
      if (INVALID_TOKEN_CODES.has(code)) invalid.push(chunk[index]);
    });
  }

  if (invalid.length > 0) {
    await pruneTokens(admin, invalid);
  }

  return { sent, failed };
}

/** Removes tokens FCM rejected; a failed prune must not fail the send. */
async function pruneTokens(admin, entries) {
  const { FieldValue } = await import('firebase-admin/firestore');
  const byUid = new Map();

  for (const entry of entries) {
    const list = byUid.get(entry.uid) ?? [];
    list.push(entry);
    byUid.set(entry.uid, list);
  }

  await Promise.all(
    Array.from(byUid.entries()).map(async ([uid, list]) => {
      const updates = {};
      const legacyTokens = [];
      for (const entry of list) {
        if (entry.id) updates[`fcmTokens.${entry.id}`] = FieldValue.delete();
        else legacyTokens.push(entry.token);
      }
      if (legacyTokens.length > 0) {
        const ref = admin.firestore.collection('users').doc(uid);
        const snap = await ref.get();
        const current = asString(snap.get('fcmToken'));
        if (legacyTokens.includes(current)) updates.fcmToken = FieldValue.delete();
      }
      if (Object.keys(updates).length === 0) return;
      try {
        await admin.firestore.collection('users').doc(uid).update(updates);
      } catch (error) {
        console.warn('[push] token prune failed:', error?.message ?? error);
      }
    }),
  );
}

/**
 * Notifies the other side of a friend-request transition.
 *
 * `autoAccepted` covers both the crossed-request case and an explicit accept:
 * the recipient is the original requester, so the useful message is "you are
 * now friends", not another request.
 *
 * @param {{ fromUid: string, toUid: string, autoAccepted?: boolean }} params
 */
export async function sendFriendRequestPush({ fromUid, toUid, autoAccepted = false }) {
  if (!fromUid || !toUid || fromUid === toUid) return { sent: 0, failed: 0 };

  const admin = await getAdmin();
  if (!admin) return { sent: 0, failed: 0 };

  const [profileSnap, userSnap] = await Promise.all([
    admin.firestore.collection('profiles').doc(fromUid).get(),
    admin.firestore.collection('users').doc(toUid).get(),
  ]);

  const profile = profileSnap.exists ? (profileSnap.data() ?? {}) : {};
  const name = asString(profile.displayName) || 'Player';
  const handle = asString(profile.handle);
  const language = userSnap.exists ? userSnap.get('language') : 'en';

  const message = autoAccepted
    ? friendAcceptedMessage(language, { name })
    : friendRequestMessage(language, { name, handle: handle || 'player' });

  return sendPushToUids([toUid], {
    ...message,
    data: {
      type: autoAccepted ? 'friend_accepted' : 'friend_request',
      fromUid,
      fromHandle: handle,
    },
  });
}
