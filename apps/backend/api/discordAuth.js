/**
 * Sign in with Discord.
 *
 * ── Why the backend owns the whole handshake ─────────────────────────────────
 * Discord publishes no mobile sign-in SDK, and React Native Firebase cannot build
 * a Discord credential (`OAuthProvider.credential()` only helps for providers
 * Firebase itself supports — Discord is not one of them). The app therefore has
 * no way to exchange a Discord login for a Firebase session by itself.
 *
 * The backend does it end to end, mirroring the existing Xbox flow:
 *
 *   app ──POST /auth/discord/start──► backend ──302──► discord.com/oauth2/authorize
 *                                                                   │ user consents
 *   app ◄──gaming-zone://discord-auth?code=…── backend ◄──302── /auth/discord/callback
 *    │
 *    └─POST /auth/discord/exchange { code }──► Firebase custom token
 *                                              └─► signInWithCustomToken()
 *
 * ── Why a one-time code instead of the token in the deep link ────────────────
 * A Firebase custom token is a full account credential for its whole lifetime
 * (1 h). Putting it in a URL would leak it into the redirect Location header,
 * platform logs and the browser's address bar. The deep link carries an opaque
 * single-use code instead; the token is fetched over TLS and the stored copy is
 * destroyed by a transaction on the first read.
 *
 * ── Account resolution ───────────────────────────────────────────────────────
 * 1. `discordAccounts/{discordId}` already exists → that Firebase account wins.
 * 2. Discord's *verified* email already owns a Firebase account → sign into it.
 * 3. The caller's session is anonymous → upgrade that same UID in place, so the
 *    user keeps their linked game library, XP and FCM token (Google sign-in
 *    behaves the same way: it upgrades the anonymous account rather than
 *    replacing it). Firebase has no `discord.com` provider, so `providerToLink`
 *    is unavailable — a random email/password pair is linked instead, which is
 *    what turns the account permanent (`isAnonymous` becomes false).
 * 4. Otherwise → create a fresh permanent account.
 *
 * Every branch ends in `createCustomToken(uid)`, so the app always lands in the
 * exact same kind of session as a Google sign-in.
 *
 * ── One-time setup ───────────────────────────────────────────────────────────
 * 1. https://discord.com/developers/applications → New Application.
 * 2. OAuth2 → Redirects → add the callback URL *exactly* as it appears in
 *    DISCORD_REDIRECT_URI (e.g. https://api-fallback.vercel.app/auth/discord/callback).
 * 3. OAuth2 → copy the Client ID, reset and copy the Client Secret, and set
 *    DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET / DISCORD_REDIRECT_URI.
 * 4. Firestore → TTL → collection `discordAuthSessions`, field `expiresAt`, so
 *    codes that are never redeemed are deleted instead of accumulating. (The
 *    exchange deletes expired codes it touches; TTL covers the rest.)
 */
import crypto from 'crypto';
import { getAdmin } from './firebaseAdmin.js';
import { createLinkState, verifyLinkState } from './linkState.js';

// ─── Endpoints ───────────────────────────────────────────────────────────────

const AUTHORIZE_URL = 'https://discord.com/oauth2/authorize';
const TOKEN_URL = 'https://discord.com/api/oauth2/token';
const PROFILE_URL = 'https://discord.com/api/users/@me';

/** `identify` gives us id/username/avatar, `email` the verified address. */
const SCOPES = 'identify email';

/** The `platform` segment inside the signed state — never collides with Steam/PSN/Xbox. */
const STATE_PLATFORM = 'discord';

/** Where the callback sends the app back to. Must match the app's `DISCORD_REDIRECT`. */
const APP_REDIRECT = 'gaming-zone://discord-auth';

/** One-time exchange codes are short-lived; the app redeems them immediately. */
const SESSION_TTL_MS = 5 * 60 * 1000;

/** Per-request timeout so a hung Discord call cannot stall the lambda. */
const REQUEST_TIMEOUT_MS = 15_000;

/** Fake mailbox for Discord accounts that expose no email address. */
const SYNTHETIC_EMAIL_DOMAIN = 'discord.gamingzone.app';

// ─── Errors ──────────────────────────────────────────────────────────────────

/**
 * `reason` travels back to the app in the deep link so it can pick a message
 * instead of showing a generic failure.
 */
class DiscordAuthError extends Error {
  constructor(reason, message) {
    super(message || reason);
    this.name = 'DiscordAuthError';
    this.reason = reason;
  }
}

// ─── Configuration ───────────────────────────────────────────────────────────

/** Reads the Discord application credentials from the environment. */
export function discordConfig() {
  const clientId = String(process.env.DISCORD_CLIENT_ID || '').trim();
  const clientSecret = String(process.env.DISCORD_CLIENT_SECRET || '').trim();
  const redirectUri = String(process.env.DISCORD_REDIRECT_URI || '').trim();
  // A secret is required: we use the authorization-code grant without PKCE, and
  // Discord rejects the exchange from a public client.
  return { clientId, clientSecret, redirectUri, configured: Boolean(clientId && clientSecret) };
}

/** The URI registered in the Discord portal — an override wins over the request host. */
function resolveRedirectUri(req, config) {
  return config.redirectUri || `${baseUrlFrom(req)}/auth/discord/callback`;
}

/** Reconstructs the public origin behind the Vercel proxy. */
function baseUrlFrom(req) {
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || (req.socket?.encrypted ? 'https' : 'http');
  return `${proto}://${host}`;
}

// ─── Discord HTTP ────────────────────────────────────────────────────────────

/** `fetch` with a hard deadline; Discord occasionally stalls under load. */
function fetchWithTimeout(url, options = {}) {
  return fetch(url, { ...options, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
}

/** Swaps the authorization code for an access token. */
async function exchangeCodeForToken({ code, redirectUri, config }) {
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  });

  const response = await fetchWithTimeout(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new DiscordAuthError(
      'token_exchange_failed',
      `Discord token exchange failed (${response.status}): ${detail.slice(0, 200)}`,
    );
  }

  const data = await response.json();
  if (!data?.access_token) {
    throw new DiscordAuthError('token_exchange_failed', 'Discord returned no access token');
  }
  return data;
}

/** Reads the signed-in Discord profile (`/users/@me`). */
async function fetchDiscordProfile(accessToken) {
  const response = await fetchWithTimeout(PROFILE_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new DiscordAuthError(
      'profile_failed',
      `Discord profile request failed (${response.status})`,
    );
  }

  const profile = await response.json();
  if (!profile?.id) {
    throw new DiscordAuthError('profile_failed', 'Discord returned no user id');
  }
  return profile;
}

// ─── Profile normalisation ───────────────────────────────────────────────────

/** Discord's new display name, falling back to the legacy handle. */
function displayNameOf(profile) {
  return String(profile.global_name || profile.username || 'Discord User').slice(0, 100);
}

/**
 * Discord avatar CDN URL. `a_…` hashes are animated (GIF); accounts without an
 * avatar get one of the six default colours, indexed by the snowflake's high bits.
 */
function avatarUrlOf(profile) {
  const id = String(profile.id);
  if (profile.avatar) {
    const ext = String(profile.avatar).startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${id}/${profile.avatar}.${ext}?size=256`;
  }
  try {
    // Snowflakes exceed Number.MAX_SAFE_INTEGER — the shift must use BigInt.
    const index = Number((BigInt(id) >> 22n) % 6n);
    return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
  } catch {
    return `https://cdn.discordapp.com/embed/avatars/0.png`;
  }
}

/** A valid, unique-looking address for accounts that expose no email. */
function syntheticEmail(discordId) {
  return `discord_${discordId}@${SYNTHETIC_EMAIL_DOMAIN}`;
}

/**
 * A password nobody ever sees: it only exists so Firebase records a non-anonymous
 * provider on the account. It is generated per call, never returned to the
 * client and never logged.
 */
function randomPassword() {
  return crypto.randomBytes(48).toString('base64url');
}

// ─── Account resolution ──────────────────────────────────────────────────────

/**
 * Resolves (or creates) the Firebase account behind a Discord identity.
 * `caller` is the session that started the flow: `{ uid, anonymous }`.
 * Returns the Firebase UID the custom token must be minted for.
 */
async function resolveAccount(admin, profile, caller) {
  const discordId = String(profile.id);
  const mappingRef = admin.firestore.collection('discordAccounts').doc(discordId);

  const profileFields = {
    discordId,
    username: profile.username ?? null,
    displayName: displayNameOf(profile),
    avatarUrl: avatarUrlOf(profile),
    email: profile.email ?? null,
  };

  /**
   * Fills in Firebase's display name / avatar from Discord — but only when the
   * account has none. An account that was created through Google or email may
   * already carry a name the user chose; a Discord login must not overwrite it.
   */
  const fillMissingProfile = async (uid) => {
    try {
      const existing = await admin.auth.getUser(uid);
      const patch = {};
      if (!existing.displayName) patch.displayName = profileFields.displayName;
      if (!existing.photoURL) patch.photoURL = profileFields.avatarUrl;
      if (Object.keys(patch).length === 0) return;
      await admin.auth.updateUser(uid, patch);
    } catch (err) {
      // A stale profile is cosmetic — never fail a sign-in over it.
      console.warn('Discord: profile refresh failed:', err?.code ?? err?.message);
    }
  };

  const link = async (uid) => {
    await mappingRef.set(
      { ...profileFields, uid, linkedAt: new Date(), updatedAt: new Date() },
      { merge: true },
    );
    return uid;
  };

  // 1. The Discord identity is already bound — that account wins.
  const mapping = await mappingRef.get();
  const mappedUid = mapping.exists ? mapping.data()?.uid : null;
  if (mappedUid) {
    await fillMissingProfile(mappedUid);
    return link(mappedUid);
  }

  // Only a Discord-verified address may be trusted for account matching.
  const verifiedEmail = profile.email && profile.verified ? String(profile.email) : null;

  // 2. A Firebase account already owns this verified email.
  if (verifiedEmail) {
    const existing = await admin.auth.getUserByEmail(verifiedEmail).catch(() => null);
    if (existing) {
      await fillMissingProfile(existing.uid);
      return link(existing.uid);
    }
  }

  // 3. Upgrade the caller's anonymous account in place (keeps UID + all data).
  //    The random password is only written here — a guest has no password to
  //    replace — and it turns the account permanent (`isAnonymous` → false).
  if (caller.uid && caller.anonymous) {
    try {
      const patch = {
        email: verifiedEmail || syntheticEmail(discordId),
        emailVerified: Boolean(verifiedEmail),
        password: randomPassword(),
      };
      const guest = await admin.auth.getUser(caller.uid);
      if (!guest.displayName) patch.displayName = profileFields.displayName;
      if (!guest.photoURL) patch.photoURL = profileFields.avatarUrl;

      await admin.auth.updateUser(caller.uid, patch);
      return link(caller.uid);
    } catch (err) {
      // e.g. the email was claimed between step 2 and here — fall back to a
      // brand-new account instead of failing the sign-in.
      console.warn(
        'Discord: in-place upgrade failed, creating a new account:',
        err?.code ?? err?.message,
      );
    }
  }

  // 4. Brand-new permanent account.
  const baseProfile = {
    displayName: profileFields.displayName,
    photoURL: profileFields.avatarUrl,
    password: randomPassword(),
  };

  let created;
  try {
    created = await admin.auth.createUser({
      ...baseProfile,
      email: verifiedEmail || syntheticEmail(discordId),
      emailVerified: Boolean(verifiedEmail),
    });
  } catch (err) {
    if (err?.code !== 'auth/email-already-in-use' || !verifiedEmail) throw err;
    created = await admin.auth.createUser({
      ...baseProfile,
      email: syntheticEmail(discordId),
      emailVerified: false,
    });
  }

  return link(created.uid);
}

// ─── Route registration ──────────────────────────────────────────────────────

/**
 * Mounts every Discord sign-in endpoint. Dependencies are injected to avoid a
 * circular import with index.js (AppError / asyncRoute live there).
 */
export function registerDiscordAuthRoutes(app, { AppError, asyncRoute }) {
  /** Answers directly (not thrown): the central handler masks every 5xx message. */
  const notConfigured = (res) =>
    res.status(503).json({ message: 'Discord sign-in is not configured on this server' });

  const deepLink = (params) => `${APP_REDIRECT}?${new URLSearchParams(params).toString()}`;

  // ── Health: is this deployment able to do Discord sign-in at all? ──────────

  app.get('/auth/discord/status', (req, res) => {
    res.json({ configured: discordConfig().configured });
  });

  // ── Step 1: mint a signed state and hand back the Discord authorize URL ────

  app.post(
    '/auth/discord/start',
    requireFirebaseUser(AppError),
    asyncRoute(async (req, res) => {
      const config = discordConfig();
      if (!config.configured) return notConfigured(res);

      // `extra` records whether the caller is anonymous, because the callback
      // must know whether it is allowed to upgrade this UID in place.
      const state = createLinkState(
        req.authUid,
        STATE_PLATFORM,
        req.authAnonymous ? 'anonymous' : 'permanent',
      );

      const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: resolveRedirectUri(req, config),
        response_type: 'code',
        scope: SCOPES,
        state,
        // Always show the consent screen so a shared device cannot silently
        // sign into whichever Discord account happens to be logged in.
        prompt: 'consent',
      });

      res.json({ startUrl: `${AUTHORIZE_URL}?${params.toString()}` });
    }),
  );

  // ── Step 2: Discord redirects back here ───────────────────────────────────

  app.get(
    '/auth/discord/callback',
    asyncRoute(async (req, res) => {
      const fail = (reason) => res.redirect(deepLink({ status: 'error', reason }));

      const verified = verifyLinkState(String(req.query.state || ''), STATE_PLATFORM);
      if (!verified) return fail('invalid_state');

      const config = discordConfig();
      if (!config.configured) return fail('not_configured');

      // The user pressed "Cancel" on Discord's consent screen.
      const oauthError = String(req.query.error || '');
      if (oauthError) return fail(oauthError);

      const code = String(req.query.code || '');
      if (!code) return fail('missing_code');

      try {
        const admin = await getAdmin();
        if (!admin) return fail('server_not_configured');

        const tokens = await exchangeCodeForToken({
          code,
          redirectUri: resolveRedirectUri(req, config),
          config,
        });
        const profile = await fetchDiscordProfile(tokens.access_token);

        const uid = await resolveAccount(admin, profile, {
          uid: verified.uid,
          anonymous: verified.extra === 'anonymous',
        });

        const customToken = await admin.auth.createCustomToken(uid);

        // Hand the app an opaque, single-use handle instead of the credential.
        const sessionCode = crypto.randomBytes(32).toString('base64url');
        await admin.firestore
          .collection('discordAuthSessions')
          .doc(sessionCode)
          .set({
            uid,
            customToken,
            expiresAt: new Date(Date.now() + SESSION_TTL_MS),
          });

        return res.redirect(deepLink({ status: 'success', code: sessionCode }));
      } catch (err) {
        const reason = err instanceof DiscordAuthError ? err.reason : 'auth_failed';
        console.warn('Discord callback failed:', reason, err?.message || err);
        return fail(reason);
      }
    }),
  );

  // ── Step 3: the app trades the one-time code for the custom token ─────────

  app.post(
    '/auth/discord/exchange',
    asyncRoute(async (req, res) => {
      const code = String(req.body?.code || '').trim();
      if (!code) throw new AppError('code is required', 400);

      const admin = await getAdmin();
      if (!admin) return notConfigured(res);

      const ref = admin.firestore.collection('discordAuthSessions').doc(code);

      // Transactional so a code can never be redeemed twice (two concurrent
      // requests would otherwise both read the doc before either deletes it).
      const customToken = await admin.firestore.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) return null;

        const data = snap.data() ?? {};
        // Consume the code no matter the outcome — an expired one must not linger.
        tx.delete(ref);

        const expiresAt = data.expiresAt?.toDate?.() ?? new Date(data.expiresAt ?? 0);
        if (!expiresAt || Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
          return null;
        }
        return typeof data.customToken === 'string' && data.customToken ? data.customToken : null;
      });

      if (!customToken) {
        throw new AppError('This Discord sign-in link is invalid or has expired', 400);
      }

      res.setHeader('Cache-Control', 'no-store');
      res.json({ customToken });
    }),
  );
}

// ─── Auth middleware ─────────────────────────────────────────────────────────

/**
 * Requires `Authorization: Bearer <Firebase ID token>`; attaches
 * `req.authUid` plus `req.authAnonymous` (from the token's sign-in provider,
 * which the client cannot forge).
 */
function requireFirebaseUser(AppError) {
  return async (req, _res, next) => {
    const admin = await getAdmin();
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
    if (!token || !admin) {
      return next(
        new AppError('Authorization header with a Firebase ID token is required', 401),
      );
    }
    try {
      const decoded = await admin.auth.verifyIdToken(token, true);
      req.authUid = decoded.uid;
      // `sign_in_provider` is set by Firebase, not by the caller.
      req.authAnonymous = decoded.firebase?.sign_in_provider === 'anonymous';
      next();
    } catch (err) {
      console.warn('Discord auth: verifyIdToken failed:', err?.code ?? err?.message ?? err);
      return next(new AppError('Invalid or expired session token', 401));
    }
  };
}
