/**
 * Linked accounts: auto-fetch the user's game library.
 *
 * ── Steam ────────────────────────────────────────────────────────────────────
 * Real Steam OpenID sign-in. The app asks for a signed `state` (HMAC bound to
 * the Firebase UID + expiry), opens the Steam login in a browser session, and
 * Steam redirects back to `/steam/openid/callback`. The callback *verifies the
 * OpenID assertion with Steam itself* and validates the state signature BEFORE
 * it trusts the SteamID — nobody can link an arbitrary SteamID into someone
 * else's account by crafting the callback URL.
 *
 * ── PSN ──────────────────────────────────────────────────────────────────────
 * One-time NPSSO token (`https://ca.account.sony.com/api/v1/ssocookie`, shown
 * as JSON after the user logs in) exchanged server-side via `psn-api` for a
 * refresh token. The refresh token is AES-256-GCM encrypted with SERVER_SECRET
 * and stored in a top-level collection clients cannot touch (Firestore rules
 * deny everything outside `users/*`, and admin-SDK bypasses rules anyway).
 * `/psn/sync` refreshes the access token, pulls played titles and returns them
 * for IGDB name-mapping; on an expired/invalid token the status on the linked
 * account flips to `reauth_required` instead of erroring the caller.
 *
 * ── IGDB name mapping ────────────────────────────────────────────────────────
 * IGDB allows only 4 req/sec. Name → IGDB resolutions are therefore cached in
 * the `igdb_name_map` Firestore collection (shared across ALL users — a title
 * hits IGDB once globally). Misses are resolved through IGDB multiquery (up to
 * 10 search sub-queries per request) with paced serial chunks. Titles that
 * cannot be matched get a negative-cache entry with a 7-day TTL so a missing
 * IGDB record is never re-hammered.
 */
import crypto from 'crypto';
import fs from 'fs';
import * as psnApi from 'psn-api';
import { cert, initializeApp } from 'firebase-admin';

// ─── Firestore (admin) ───────────────────────────────────────────────────────

let adminReady = false;
let adminModules = null; // { auth, firestore }

/**
 * Lazily initialises the Firebase admin SDK. The firestore/auth sub-modules
 * are dynamic imports so that a missing optional dependency can never crash
 * the whole lambda at boot — linked-account endpoints degrade to auth errors
 * instead, and the rest of the API keeps working.
 */
async function getAdmin() {
  if (adminReady) return adminModules;

  const raw =
    process.env.FCM_SERVICE_ACCOUNT ||
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
    null;

  let serviceAccount = null;
  try {
    if (raw) {
      serviceAccount = JSON.parse(String(raw).trim());
    } else if (process.env.SERVICE_ACCOUNT) {
      // Local-dev convenience: path to the JSON file.
      serviceAccount = JSON.parse(
        fs.readFileSync(
          fs.existsSync(process.env.SERVICE_ACCOUNT)
            ? process.env.SERVICE_ACCOUNT
            : `./serviceAccountKey.json`,
          'utf8',
        ),
      );
    }
  } catch (err) {
    console.error('Linked accounts: failed to parse service account credentials:', err);
  }

  if (!serviceAccount) {
    console.error(
      'Linked accounts require a Firebase service account (env FCM_SERVICE_ACCOUNT as JSON string).',
    );
    adminReady = true;
    return null;
  }

  try {
    const [{ getAuth }, { getFirestore }] = await Promise.all([
      import('firebase-admin/auth'),
      import('firebase-admin/firestore'),
    ]);
    const app = initializeApp({
      credential: cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id,
    });
    adminModules = { auth: getAuth(app), firestore: getFirestore(app) };
    adminReady = true;
  } catch (err) {
    console.error('Linked accounts: failed to initialise Firebase admin:', err);
  }
  return adminModules;
}

// ─── SECRET / HMAC helpers ───────────────────────────────────────────────────

const linkSecret = () => process.env.SERVER_SECRET || process.env.RSS_SECRET || '';
const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * state format: base64url("<uid>|<platform>|<expiresAt>") + "." + HMAC-SHA256
 * Binds every link attempt to an authenticated Firebase user and a deadline.
 */
function createLinkState(uid, platform) {
  const expiresAt = Date.now() + STATE_TTL_MS;
  const payload = `${uid}|${platform}|${expiresAt}`;
  const body = Buffer.from(payload).toString('base64url');
  const sig = crypto.createHmac('sha256', linkSecret()).update(payload).digest('base64url');
  return `${body}.${sig}`;
}

/** Returns the verified UID, or null for a bad/expired/tampered state. */
function verifyLinkState(state, platform) {
  if (!state || typeof state !== 'string' || !linkSecret()) return null;
  const separatorIdx = state.lastIndexOf('.');
  if (separatorIdx < 0) return null;

  const body = state.slice(0, separatorIdx);
  const sig = state.slice(separatorIdx + 1);
  const payload = Buffer.from(body, 'base64url').toString('utf8');
  const expectedSig = crypto.createHmac('sha256', linkSecret()).update(payload).digest('base64url');
  const sigOk =
    sig.length === expectedSig.length &&
    crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig));
  if (!sigOk) return null;

  const [uid, platformInState, expiresAtRaw] = payload.split('|');
  if (!uid || platformInState !== platform) return null;
  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return null;
  return uid;
}

// ─── Secret-at-rest: AES-256-GCM ─────────────────────────────────────────────

const secretKey = () => crypto.createHash('sha256').update(linkSecret()).digest();

/** Returns "<iv base64url>.<ciphertext base64url>.<tag base64url>". */
function encryptSecret(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', secretKey(), iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [
    iv.toString('base64url'),
    ct.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
  ].join('.');
}

function decryptSecret(blob) {
  const [ivB64, ctB64, tagB64] = String(blob).split('.');
  if (!ivB64 || !ctB64 || !tagB64) return null;
  try {
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      secretKey(),
      Buffer.from(ivB64, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(ctB64, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    return null;
  }
}

// ─── Firestore document helpers ──────────────────────────────────────────────

async function setLinkedAccount(uid, platform, data) {
  const admin = await getAdmin();
  if (!admin) throw new Error('firebase admin unavailable');
  const ref = admin.firestore.collection('users').doc(uid).collection('linkedAccounts').doc(platform);
  await ref.set(
    {
      platform,
      ...data,
      linkedAt: new Date(),
    },
    { merge: true },
  );
}

async function getLinkedAccountDoc(uid, platform) {
  const admin = await getAdmin();
  if (!admin) return null;
  const snap = await admin.firestore
    .collection('users')
    .doc(uid)
    .collection('linkedAccounts')
    .doc(platform)
    .get();
  return snap.exists ? snap.data() : null;
}

/** Top-level secrets doc — never readable/writable by clients (rules deny). */
async function getSecretDoc(uid) {
  const admin = await getAdmin();
  if (!admin) return null;
  const snap = await admin.firestore.collection('linkedAccountSecrets').doc(uid).get();
  return snap.exists ? snap.data() : null;
}

async function setSecretDoc(uid, platform, payload) {
  const admin = await getAdmin();
  if (!admin) throw new Error('firebase admin unavailable');
  await admin.firestore.collection('linkedAccountSecrets').doc(uid).set(
    { [platform]: payload },
    { merge: true },
  );
}

// ─── Auth middleware (Firebase ID token) ─────────────────────────────────────

/**
 * Requires `Authorization: Bearer <Firebase ID token>`; attaches req.authUid.
 */
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
      // Server-side visibility: a 401 needs to say WHY in the Vercel runtime logs.
      console.warn("verifyIdToken failed:", err?.code ?? err?.message ?? err);
      return next(new AppError('Invalid or expired session token', 401));
    }
  };
}

// ─── Title normalisation (mirror of @gaming-zone/utils normalizeGameTitle) ───

const normalizeTitle = (title) =>
  String(title ?? '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');

// ─── IGDB name-map cache ─────────────────────────────────────────────────────

const NEGATIVE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days, then retry the lookup
const MULTIQUERY_CHUNK = 10; // sub-queries per multiquery call
const CHUNK_PACE_MS = 300; // ≤ ~3 multiquery calls/sec under load spikes
const SEARCH_RESULTS_LIMIT = 5;

const cacheKey = (normalized) =>
  crypto.createHash('sha1').update(normalized).digest('hex');

/** Reads the whole cache set for the given normalized titles. */
async function readNameCache(normalizedTitles) {
  const admin = await getAdmin();
  if (!admin || normalizedTitles.length === 0) return new Map();
  const db = admin.firestore;
  const map = new Map();
  const refs = Array.from(new Set(normalizedTitles)).map((n) =>
    db.collection('igdb_name_map').doc(cacheKey(n)),
  );
  // Firestore admin getAll supports up to ~1000 refs
  for (let i = 0; i < refs.length; i += 500) {
    const snaps = await db.getAll(...refs.slice(i, i + 500));
    for (const snap of snaps) {
      if (!snap.exists) continue;
      map.set(snap.id, snap.data());
    }
  }
  return map;
}

async function writeNameCacheEntries(entries) {
  const admin = await getAdmin();
  if (!admin || entries.length === 0) return;
  const collection = admin.firestore.collection('igdb_name_map');
  for (let i = 0; i < entries.length; i += 400) {
    const batch = admin.firestore.batch();
    for (const entry of entries.slice(i, i + 400)) {
      batch.set(collection.doc(entry.key), entry.data, { merge: true });
    }
    await batch.commit();
  }
}

/** Escapes a name for the IGDB `search "…"` directive. */
const sanitizeForSearch = (name) => String(name ?? '').replace(/[\\"\r\n]/g, ' ').trim();

/**
 * One multiquery round for up to 10 titles. Returns a Map of
 * normalizedName → best IGDB game (or null).
 */
async function resolveNamesViaIgdb(normalizedToOriginal, callIgdb, sleep) {
  const names = Array.from(normalizedToOriginal.keys()).slice(0, MULTIQUERY_CHUNK);
  const subqueries = names.map((name, idx) => {
    const original = normalizedToOriginal.get(name);
    return (
      `m${idx}: fields id,name,cover.image_id,first_release_date,game_type,version_of;` +
      ` search "${sanitizeForSearch(original)}";` +
      ` where version_of = null & game_type != (14,16,17);` +
      ` limit ${SEARCH_RESULTS_LIMIT};`
    );
  });

  const body = `multiquery ${subqueries.join(' ')}`;
  const raw = await callIgdb('multiquery', body);

  const byKey = new Map();
  for (const item of Array.isArray(raw) ? raw : []) {
    byKey.set(String(item?.key ?? item?.id ?? ''), Array.isArray(item?.result) ? item.result : []);
  }

  const resolved = new Map();
  names.forEach((normalizedName, idx) => {
    const candidates = byKey.get(`m${idx}`) ?? [];
    resolved.set(normalizedName, pickBestCandidate(normalizedName, candidates));
  });
  return resolved;
}

/**
 * Ranks IGDB hits for a title: exact normalized match > prefix > includes.
 * Only true title matches are trusted; a bare first result is NOT a match —
 * that becomes a negative-cache entry.
 */
function pickBestCandidate(normalizedName, candidates) {
  if (!Array.isArray(candidates) || candidates.length === 0) return null;

  const gameTypeOk = (g) =>
    g?.game_type == null || ![14, 16, 17].includes(Number(g.game_type));

  const exact = candidates.find(
    (g) => gameTypeOk(g) && normalizeTitle(g?.name) === normalizedName,
  );
  if (exact) return { game: toMappedGame(exact), trusted: true };

  const prefix = candidates.find(
    (g) => gameTypeOk(g) && normalizeTitle(g?.name).startsWith(normalizedName),
  );
  if (prefix) return { game: toMappedGame(prefix), trusted: true };

  const includes = candidates.find(
    (g) => gameTypeOk(g) && normalizeTitle(g?.name).includes(normalizedName),
  );
  if (includes) return { game: toMappedGame(includes), trusted: true };

  // Same normalized name with subtitle must not "include" fail badly — put a
  // soft fallback: the top search result only counts as trusted when more
  // candidates don't exist; otherwise treat as unmatched.
  return null;
}

/** Trimmed IGDB game shape used by the app's list writes (Steam-compatible). */
function toMappedGame(g) {
  return {
    id: Number(g.id),
    name: g.name,
    cover_image_id: g.cover?.image_id ?? null,
    release_date: g.first_release_date
      ? new Date(g.first_release_date * 1000).getFullYear().toString()
      : '',
  };
}

// ─── Route registration ──────────────────────────────────────────────────────

/**
 * Mounts every linked-account endpoint. Dependencies are injected to avoid a
 * circular import with index.js (AppError, asyncRoute, callIgdb come from the
 * shared igdbClient module).
 */
export function registerLinkedAccountRoutes(app, { AppError, asyncRoute, callIgdb }) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const auth = requireAuth(AppError);

  const baseUrlFrom = (req) => {
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const proto = req.headers['x-forwarded-proto'] || (req.socket?.encrypted ? 'https' : 'http');
    return `${proto}://${host}`;
  };

  // ── State: signed, time-limited linkage intent ────────────────────────────

  app.get(
    '/linked-accounts/state',
    auth,
    asyncRoute(async (req, res) => {
      const platform = String(req.query.platform || '').toLowerCase();
      const allowed = ['steam', 'psn'];
      if (!allowed.includes(platform)) {
        throw new AppError(`platform must be one of: ${allowed.join(', ')}`, 400);
      }
      if (!linkSecret()) {
        throw new AppError('SERVER_SECRET is not configured', 500);
      }

      const state = createLinkState(req.authUid, platform);
      let startUrl = null;
      if (platform === 'steam') {
        const callbackUrl = `${baseUrlFrom(req)}/steam/openid/callback`;
        const params = new URLSearchParams({
          'openid.ns': 'http://specs.openid.net/auth/2.0',
          'openid.mode': 'checkid_setup',
          'openid.return_to': `${callbackUrl}?state=${encodeURIComponent(state)}`,
          'openid.realm': `${baseUrlFrom(req)}`,
          'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
          'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
        });
        startUrl = `https://steamcommunity.com/openid/login?${params.toString()}`;
      } else if (platform === 'psn') {
        startUrl = 'https://ca.account.sony.com/api/v1/ssocookie';
      }

      res.json({ state, startUrl });
    }),
  );

  // ── Steam OpenID ──────────────────────────────────────────────────────────

  app.get(
    '/steam/openid/callback',
    asyncRoute(async (req, res) => {
      const state = String(req.query.state || '');
      const uid = verifyLinkState(state, 'steam');
      if (!uid) {
        return res.redirect('gaming-zone://steam-link?status=error&reason=invalid_state');
      }

      const userSteamId = extractSteamId(String(req.query['openid.claimed_id'] || ''));
      if (!userSteamId || String(req.query['openid.mode']) !== 'id_res') {
        return res.redirect('gaming-zone://steam-link?status=error&reason=invalid_response');
      }

      // Verify the assertion with Steam (check_authentication round-trip)
      const verification = new URLSearchParams();
      for (const [key, value] of Object.entries(req.query)) {
        if (key.startsWith('openid.')) verification.set(key, String(value));
      }
      verification.set('openid.mode', 'check_authentication');

      const verifyRes = await fetch('https://steamcommunity.com/openid/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: verification.toString(),
      });
      const verifyBody = await verifyRes.text();
      if (!verifyBody.includes('is_valid:true')) {
        return res.redirect('gaming-zone://steam-link?status=error&reason=verification_failed');
      }

      await setLinkedAccount(uid, 'steam', {
        steamId: userSteamId,
        status: 'active',
        lastSyncedAt: null,
      });
      return res.redirect('gaming-zone://steam-link?status=success');
    }),
  );

  // ── PSN link ──────────────────────────────────────────────────────────────

  app.post(
    '/psn/link',
    auth,
    asyncRoute(async (req, res) => {
      const npsso = String(req.body?.npsso || '').trim();
      if (!npsso) throw new AppError('npsso is required', 400);

      let accessCode;
      try {
        accessCode = await psnApi.exchangeNpssoForAccessCode(npsso);
      } catch {
        throw new AppError('Could not verify the PSN token. Is your NPSSO code valid?', 400);
      }

      const authTokens = await psnApi.exchangeAccessCodeForAuthTokens(accessCode);
      if (!authTokens?.refreshToken) {
        throw new AppError('PSN did not return a refresh token. Try again.', 502);
      }

      // The idToken JWT carries the accountId (sub) and online id (preferred_username)
      const { accountId, onlineId } = parsePsnIdToken(authTokens.idToken);

      await setSecretDoc(req.authUid, 'psn', {
        refreshTokenEnc: encryptSecret(authTokens.refreshToken),
        refreshTokenExpiresAt: new Date(Date.now() + (authTokens.refreshTokenExpiresIn ?? 0) * 1000),
        accountId: accountId || null,
      });

      await setLinkedAccount(req.authUid, 'psn', {
        status: 'active',
        accountId: accountId || null,
        onlineId: onlineId || null,
        lastSyncedAt: null,
      });

      res.json({ ok: true, onlineId: onlineId || null });
    }),
  );

  // ── PSN sync ──────────────────────────────────────────────────────────────

  app.post(
    '/psn/sync',
    auth,
    asyncRoute(async (req, res) => {
      const secrets = await getSecretDoc(req.authUid, 'psn');
      const refreshBlob = secrets?.psn?.refreshTokenEnc;
      if (!refreshBlob) {
        return res.json({ status: 'reauth_required' });
      }
      const refreshToken = decryptSecret(refreshBlob);
      if (!refreshToken) {
        await markPsnReauthRequired(req.authUid);
        return res.json({ status: 'reauth_required' });
      }

      let authTokens;
      try {
        authTokens = await psnApi.exchangeRefreshTokenForAuthTokens(refreshToken);
      } catch {
        // Refresh token expired (~2 months) or revoked (password change etc.)
        await markPsnReauthRequired(req.authUid);
        return res.json({ status: 'reauth_required' });
      }

      if (authTokens?.refreshToken && authTokens.refreshToken !== refreshToken) {
        await setSecretDoc(req.authUid, 'psn', {
          refreshTokenEnc: encryptSecret(authTokens.refreshToken),
          refreshTokenExpiresAt: new Date(
            Date.now() + (authTokens.refreshTokenExpiresIn ?? 0) * 1000,
          ),
        });
      }

      let played;
      try {
        played = await psnApi.getUserPlayedGames(authTokens, 'me', { limit: 500 });
      } catch {
        await markPsnReauthRequired(req.authUid);
        return res.json({ status: 'reauth_required' });
      }

      const titles = (played?.titles ?? []).map((t) => ({
        titleId: t.titleId ?? null,
        name: t.localizedName || t.name || t.titleId,
        imageUrl: t.localizedImageUrl || t.imageUrl || null,
        category: t.category ?? null,
        lastPlayedDateTime: t.lastPlayedDateTime ?? null,
        playCount: t.playCount ?? 0,
      }));

      await setLinkedAccount(req.authUid, 'psn', {
        status: 'active',
        lastSyncedAt: new Date(),
      });

      res.json({ status: 'ok', titles });
    }),
  );

  // ── IGDB name mapping (with the shared global cache) ──────────────────────

  app.post(
    '/igdb/map-by-names',
    auth,
    asyncRoute(async (req, res) => {
      const titles = Array.isArray(req.body?.titles) ? req.body.titles.slice(0, 200) : [];
      if (titles.length === 0) return res.json({ results: [] });

      const normalizedToOriginal = new Map();
      for (const title of titles) {
        const original = String(title ?? '').trim();
        if (!original) continue;
        const normalized = normalizeTitle(original);
        if (!normalized) continue;
        if (!normalizedToOriginal.has(normalized)) normalizedToOriginal.set(normalized, original);
      }

      const cache = await readNameCache(Array.from(normalizedToOriginal.keys()));
      const now = Date.now();

      const misses = new Map(); // normalized → original, filtered for fresh negatives
      const results = new Map(); // normalized → mapped game or null
      const cacheWrites = [];

      for (const [normalized, original] of normalizedToOriginal.entries()) {
        const entry = cache.get(cacheKey(normalized));
        if (entry) {
          const confidence = Number(entry.confidence ?? 0);
          const expired =
            confidence === 0 &&
            (entry.expiresAtMs ?? 0) < now; // negative cache expired → retry
          if (!expired) {
            results.set(normalized, confidence > 0 ? entryToMapped(entry) : null);
            continue;
          }
        }
        misses.set(normalized, original);
      }

      // Resolve misses in paced multiquery chunks
      const pending = new Map(misses);
      while (pending.size > 0) {
        const chunkNames = Array.from(pending.keys()).slice(0, MULTIQUERY_CHUNK);
        const chunk = new Map(chunkNames.map((n) => [n, pending.get(n)]));

        let resolved;
        try {
          resolved = await resolveNamesViaIgdb(chunk, callIgdb, sleep);
        } catch {
          resolved = new Map();
        }

        for (const [normalized, original] of chunk.entries()) {
          const best = resolved.get(normalized);
          if (best?.trusted) {
            results.set(normalized, best.game);
            cacheWrites.push({
              key: cacheKey(normalized),
              data: {
                title: original,
                igdbId: best.game.id,
                name: best.game.name,
                cover_image_id: best.game.cover_image_id,
                release_date: best.game.release_date,
                confidence: 1,
                mappedAtMs: now,
              },
            });
          } else {
            results.set(normalized, null);
            cacheWrites.push({
              key: cacheKey(normalized),
              data: {
                title: original,
                confidence: 0,
                mappedAtMs: now,
                expiresAtMs: now + NEGATIVE_TTL_MS,
              },
            });
          }
          pending.delete(normalized);
        }

        if (pending.size > 0) await sleep(CHUNK_PACE_MS);
      }

      // Fire-and-forget cache writes — results are returned regardless
      writeNameCacheEntries(cacheWrites).catch((err) =>
        console.warn('igdb_name_map write failed:', err?.message || err),
      );

      const response = Array.from(normalizedToOriginal.entries()).map(([normalized, original]) => ({
        title: original,
        game: results.get(normalized) ?? null,
      }));
      res.json({ results: response });
    }),
  );

  // ── Helpers ───────────────────────────────────────────────────────────────

  async function markPsnReauthRequired(uid) {
    try {
      await setLinkedAccount(uid, 'psn', { status: 'reauth_required' });
    } catch (err) {
      console.warn('Failed to flag reauth_required:', err?.message || err);
    }
  }

  function entryToMapped(entry) {
    return {
      id: Number(entry.igdbId),
      name: entry.name,
      cover_image_id: entry.cover_image_id ?? null,
      release_date: entry.release_date ?? '',
    };
  }
}

// ─── Module-level helpers ────────────────────────────────────────────────────

/** "https://steamcommunity.com/openid/id/<17-digit-id>" → the id, or null. */
function extractSteamId(claimedId) {
  const match = claimedId.match(/openid\/id\/(\d{17})$/);
  return match ? match[1] : null;
}

/** Pulls accountId + onlineId out of the PSN idToken JWT (unverified decode —
 * it came straight from Sony over TLS, so its content is trustworthy). */
function parsePsnIdToken(idToken) {
  try {
    const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64url').toString('utf8'));
    return { accountId: payload.sub || null, onlineId: payload.preferred_username || null };
  } catch {
    return { accountId: null, onlineId: null };
  }
}
