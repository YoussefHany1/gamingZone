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
 * ── Xbox ─────────────────────────────────────────────────────────────────────
 * A real Microsoft OAuth v2.0 sign-in (personal accounts only, `/consumers`
 * tenant) with PKCE. The authorization code is exchanged server-side for an
 * MSA refresh token, which is AES-256-GCM encrypted and stored like the PSN
 * one. Every sync mints a fresh Xbox Live (XBL) + XSTS token from it, so the
 * user signs in only once. There is no purchase history for modern Xbox, so
 * the library is the recently played titles plus the achievement titles that
 * show real progress (see `xboxClient.js`).
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
import * as psnApi from 'psn-api';
import { getAdmin } from './firebaseAdmin.js';
import { createLinkState, verifyLinkState } from './linkState.js';
import { syncProfileLinks } from './social.js';
import {
  authenticateXbox,
  buildAuthorizeUrl,
  createPkce,
  exchangeCodeForTokens,
  fetchGamertag,
  fetchXboxLibrary,
  refreshMsaToken,
  xboxConfig,
  XboxError,
} from './xboxClient.js';

// ─── Firestore (admin) ───────────────────────────────────────────────────────

// The admin SDK singleton lives in firebaseAdmin.js — see that module for the
// lazy initialisation and service-account handling.

// ─── SECRET / HMAC helpers ───────────────────────────────────────────────────

const linkSecret = () => process.env.SERVER_SECRET || process.env.RSS_SECRET || '';

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

  // Projects the identifier into the public profile. This replaces the old
  // `onLinkedAccountWritten` Cloud Functions trigger (which would need Blaze).
  // A projection failure must not fail the link itself: the account is already
  // stored, and POST /social/links/sync can rebuild the projection later.
  try {
    await syncProfileLinks(uid);
  } catch (err) {
    console.warn('[linkedAccounts] link projection failed:', err?.message ?? err);
  }
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
async function resolveNamesViaIgdb(normalizedToOriginal, callIgdb) {
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

  // Nothing above the trust threshold — the first search hit alone is never
  // trusted. The caller negative-caches this title for a week instead.
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

/** Secret-payload shape for a fresh PSN auth token round. */
function psnSecretPayload(authTokens) {
  return {
    refreshTokenEnc: encryptSecret(authTokens.refreshToken),
    refreshTokenExpiresAt: new Date(
      Date.now() + (authTokens.refreshTokenExpiresIn ?? 0) * 1000,
    ),
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
      const allowed = ['steam', 'psn', 'xbox'];
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
        // Same sign-in chain the mobile WebView uses: the ssocookie endpoint
        // itself never renders a login form.
        startUrl =
          'https://web.np.playstation.com/api/session/v1/signin' +
          '?redirect_uri=https%3A%2F%2Fio.playstation.com%2Fcentral%2Fauth%2Flogin' +
          '%3FpostSignInURL%3Dhttps%253A%252F%252Fca.account.sony.com%252Fapi%252Fv1%252Fssocookie';
      } else if (platform === 'xbox') {
        // The whole Xbox handshake lives on the backend: /xbox/authorize sends
        // the user to Microsoft, /xbox/callback stores the tokens and deep
        // links back into the app.
        if (!xboxConfig().configured) {
          // Answered directly (not thrown): the central error handler masks
          // every 5xx message, and the client needs to know this is a missing
          // server-side app registration, not a broken request.
          return res
            .status(503)
            .json({ message: 'Xbox linking is not configured on this server' });
        }
        startUrl = `${baseUrlFrom(req)}/xbox/authorize?state=${encodeURIComponent(state)}`;
      }

      res.json({ state, startUrl });
    }),
  );

  // ── Steam OpenID ──────────────────────────────────────────────────────────

  app.get(
    '/steam/openid/callback',
    asyncRoute(async (req, res) => {
      const state = String(req.query.state || '');
      const verified = verifyLinkState(state, 'steam');
      if (!verified) {
        return res.redirect('gaming-zone://steam-link?status=error&reason=invalid_state');
      }
      const uid = verified.uid;

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
      // The Steam ID travels with the redirect so the client can start the
      // library sync immediately, even if its read of linkedAccounts/steam
      // lags behind the write we just made.
      return res.redirect(
        `gaming-zone://steam-link?status=success&steamId=${encodeURIComponent(userSteamId)}`,
      );
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

      let authTokens;
      try {
        authTokens = await psnApi.exchangeAccessCodeForAuthTokens(accessCode);
      } catch {
        throw new AppError(
          'Sony rejected the token exchange. Generate a fresh NPSSO code and link again.',
          502,
        );
      }
      if (!authTokens?.refreshToken) {
        throw new AppError('PSN did not return a refresh token. Try again.', 502);
      }

      // The idToken JWT carries the accountId (sub) and online id (preferred_username)
      const { accountId, onlineId } = parsePsnIdToken(authTokens.idToken);

      await setSecretDoc(req.authUid, 'psn', {
        ...psnSecretPayload(authTokens),
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
        await setSecretDoc(req.authUid, 'psn', psnSecretPayload(authTokens));
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

  // ── Xbox link (Microsoft OAuth → Xbox Live) ───────────────────────────────

  /**
   * Step 1 of the handshake. The state that arrives here was signed for this
   * user by /linked-accounts/state; we verify it and re-sign it with the PKCE
   * verifier so the callback can finish the exchange statelessly.
   */
  app.get(
    '/xbox/authorize',
    asyncRoute(async (req, res) => {
      const fail = (reason) =>
        res.redirect(`gaming-zone://xbox-link?status=error&reason=${encodeURIComponent(reason)}`);

      const state = String(req.query.state || '');
      const verified = verifyLinkState(state, 'xbox');
      if (!verified) return fail('invalid_state');

      const { clientId } = xboxConfig();
      if (!clientId) return fail('not_configured');

      const { verifier, challenge } = createPkce();
      const redirectUri = `${baseUrlFrom(req)}/xbox/callback`;
      const signedState = createLinkState(verified.uid, 'xbox', verifier);
      const authorizeUrl = buildAuthorizeUrl({
        clientId,
        redirectUri,
        state: signedState,
        codeChallenge: challenge,
      });
      return res.redirect(authorizeUrl);
    }),
  );

  /**
   * Step 2: Microsoft redirects back with the authorization code. We swap it
   * for MSA tokens, walk the Xbox Live chain and store the refresh token
   * encrypted. The app is woken up through the `gaming-zone://` deep link.
   */
  app.get(
    '/xbox/callback',
    asyncRoute(async (req, res) => {
      const fail = (reason) =>
        res.redirect(`gaming-zone://xbox-link?status=error&reason=${encodeURIComponent(reason)}`);

      const state = String(req.query.state || '');
      const verified = verifyLinkState(state, 'xbox');
      if (!verified) return fail('invalid_state');

      const oauthError = String(req.query.error || '');
      if (oauthError) return fail(oauthError);

      const code = String(req.query.code || '');
      if (!code) return fail('missing_code');

      try {
        const redirectUri = `${baseUrlFrom(req)}/xbox/callback`;
        const tokens = await exchangeCodeForTokens({
          code,
          codeVerifier: verified.extra,
          redirectUri,
        });
        if (!tokens.refreshToken) {
          // Without offline_access Microsoft hands back no refresh token, so
          // the link could never be renewed.
          return fail('no_refresh_token');
        }

        const session = await authenticateXbox(tokens.accessToken);
        const gamertag = await fetchGamertag(session.xuid, session.authHeader);

        await setSecretDoc(verified.uid, 'xbox', {
          refreshTokenEnc: encryptSecret(tokens.refreshToken),
          xuid: session.xuid,
        });
        await setLinkedAccount(verified.uid, 'xbox', {
          xuid: session.xuid,
          gamertag: gamertag || null,
          status: 'active',
          lastSyncedAt: null,
        });

        const params = new URLSearchParams({ status: 'success', xuid: session.xuid });
        if (gamertag) params.set('gamertag', gamertag);
        return res.redirect(`gaming-zone://xbox-link?${params.toString()}`);
      } catch (err) {
        const reason = err instanceof XboxError ? err.reason : 'auth_failed';
        console.warn('Xbox callback failed:', reason, err?.message || err);
        return fail(reason);
      }
    }),
  );

  // ── Xbox sync ─────────────────────────────────────────────────────────────

  app.post(
    '/xbox/sync',
    auth,
    asyncRoute(async (req, res) => {
      if (!xboxConfig().configured) {
        // Same wording as the state endpoint — the client shows a specific
        // "not available right now" message instead of a generic failure.
        return res
          .status(503)
          .json({ message: 'Xbox linking is not configured on this server' });
      }

      const secrets = await getSecretDoc(req.authUid, 'xbox');
      const refreshBlob = secrets?.xbox?.refreshTokenEnc;
      if (!refreshBlob) {
        return res.json({ status: 'reauth_required' });
      }
      const refreshToken = decryptSecret(refreshBlob);
      if (!refreshToken) {
        await markXboxReauthRequired(req.authUid);
        return res.json({ status: 'reauth_required' });
      }

      let tokens;
      try {
        tokens = await refreshMsaToken(refreshToken);
      } catch (err) {
        // A revoked/expired refresh token is terminal; a Microsoft outage is not.
        if (!isTerminalAuthFailure(err)) throw err;
        await markXboxReauthRequired(req.authUid);
        return res.json({ status: 'reauth_required' });
      }

      if (tokens.refreshToken && tokens.refreshToken !== refreshToken) {
        await setSecretDoc(req.authUid, 'xbox', {
          refreshTokenEnc: encryptSecret(tokens.refreshToken),
          xuid: secrets?.xbox?.xuid ?? null,
        });
      }

      let session;
      try {
        session = await authenticateXbox(tokens.accessToken);
      } catch (err) {
        if (!isTerminalAuthFailure(err)) throw err;
        await markXboxReauthRequired(req.authUid);
        return res.json({ status: 'reauth_required' });
      }

      let titles;
      try {
        titles = await fetchXboxLibrary(session);
      } catch (err) {
        console.warn('Xbox library fetch failed:', err?.message || err);
        throw new AppError('Could not read the Xbox library. Try again later.', 502);
      }

      await setLinkedAccount(req.authUid, 'xbox', {
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
        let chunkFailed = false;
        try {
          resolved = await resolveNamesViaIgdb(chunk, callIgdb);
        } catch {
          // IGDB unreachable/4xx — report unmatched for THIS response but do
          // NOT negative-cache: a transient outage must never poison the
          // 7-day "no match" entries.
          chunkFailed = true;
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
            if (!chunkFailed) {
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

  async function markXboxReauthRequired(uid) {
    try {
      await setLinkedAccount(uid, 'xbox', { status: 'reauth_required' });
    } catch (err) {
      console.warn('Failed to flag Xbox reauth_required:', err?.message || err);
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

/**
 * Is this Xbox failure terminal (the stored grant is dead) or transient
 * (Microsoft hiccup)? Only terminal failures flip the link to
 * `reauth_required` — a transient outage must never unlink a healthy account.
 */
function isTerminalAuthFailure(err) {
  if (!(err instanceof XboxError)) return false;
  if (err.kind === 'network' || err.kind === 'library') return false;
  return (
    err.reason === 'auth_failed' ||
    err.reason === 'invalid_grant' ||
    err.reason === 'no_xbox_profile' ||
    err.reason === 'child_account'
  );
}

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
