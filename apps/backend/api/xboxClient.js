/**
 * Xbox Live client — Microsoft OAuth → Xbox Live (XBL) → XSTS → library.
 *
 * ── Why this shape ───────────────────────────────────────────────────────────
 * Xbox has no public SDK and no "owned library" endpoint for modern titles.
 * The only API-backed sources of "games this account touched" are:
 *
 *   1. titlehub   → the RECENTLY PLAYED titles (with a per-device play date).
 *   2. achievements → the titles the account holds achievements for. This is
 *      noisy on its own (a demo run that earned one trophy qualifies), so the
 *      raw titles are filtered by real progress before they leave the server.
 *
 * ── The handshake ────────────────────────────────────────────────────────────
 *   authorize (login.microsoftonline.com/consumers) → code
 *   → token (MSA access + refresh token)
 *   → user.auth.xboxlive.com/user/authenticate (XBL token + uhs/xid)
 *   → xsts.auth.xboxlive.com/xsts/authorize (XSTS token)
 *   → Authorization: XBL3.0 x=<uhs>;<xsts token>
 *
 * The `/consumers` tenant is used throughout — the Azure app is registered for
 * personal Microsoft accounts only, so work/school accounts are rejected
 * cleanly instead of failing somewhere deeper in the chain.
 *
 * The MS refresh token is what the backend stores (encrypted); every later
 * sync mints a fresh XSTS token from it, so the user signs in only once.
 */
import crypto from 'crypto';

// ─── Endpoints ───────────────────────────────────────────────────────────────

const AUTHORIZE_URL = 'https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize';
const TOKEN_URL = 'https://login.microsoftonline.com/consumers/oauth2/v2.0/token';
const XBL_USER_AUTH_URL = 'https://user.auth.xboxlive.com/user/authenticate';
const XSTS_AUTH_URL = 'https://xsts.auth.xboxlive.com/xsts/authorize';
const TITLEHUB_URL = 'https://titlehub.xboxlive.com';
const ACHIEVEMENTS_URL = 'https://achievements.xboxlive.com';
const PEOPLEHUB_URL = 'https://peoplehub.xboxlive.com';

/** `offline_access` is what makes Microsoft hand us a refresh token. */
const SCOPE = 'openid profile offline_access XboxLive.signin';
const REFRESH_SCOPE = 'offline_access XboxLive.signin';

/** Decoration fields requested from titlehub (the play date lives in devices). */
const TITLE_FIELDS = [
  'TitleId',
  'ProductId',
  'ModernTitleId',
  'MediaItemType',
  'TitleType',
  'DisplayName',
  'Devices',
].join(',');

/** Minimal fallback — if the decoration list above is ever rejected. */
const TITLE_FIELDS_MINIMAL = ['TitleId', 'DisplayName', 'Devices'].join(',');

/** Paging caps — a runaway history must not blow the request budget. */
const RECENT_PAGE_LIMIT = 5;
const RECENT_PAGE_SIZE = 100;
const ACHIEVEMENT_PAGE_LIMIT = 10;
const ACHIEVEMENT_PAGE_SIZE = 200;

/** Per-request timeout so a hung Microsoft call cannot stall the function. */
const REQUEST_TIMEOUT_MS = 15_000;

/**
 * Achievement titles are only trusted when the account made real progress:
 * "1 trophy out of 50" (2%) is a demo run, not a game the user played.
 */
const ACHIEVEMENT_MIN_PERCENT = 10;
const ACHIEVEMENT_MIN_RATIO = 0.05;

// ─── Errors ──────────────────────────────────────────────────────────────────

/**
 * `kind` drives the caller's reaction:
 *  - 'auth'     → the credentials are dead → flip the account to reauth_required
 *  - 'network'  → transient → surface as a plain error, keep the link intact
 *  - 'config'   → the server is missing its Xbox env vars
 *  - 'library'  → the library call failed (transient)
 */
export class XboxError extends Error {
  constructor(message, { status = 0, reason = 'auth_failed', kind = 'auth', oauthError = null } = {}) {
    super(message);
    this.name = 'XboxError';
    this.status = status;
    this.reason = reason;
    this.kind = kind;
    this.oauthError = oauthError;
  }
}

// ─── Configuration ───────────────────────────────────────────────────────────

/** Reads the Microsoft app credentials from the environment. */
export function xboxConfig() {
  const clientId = String(process.env.XBOX_CLIENT_ID || '').trim();
  const clientSecret = String(process.env.XBOX_CLIENT_SECRET || '').trim();
  return { clientId, clientSecret, configured: Boolean(clientId) };
}

// ─── PKCE ────────────────────────────────────────────────────────────────────

/**
 * PKCE pair. The verifier travels inside the HMAC-signed link state, so the
 * callback can finish the exchange without any server-side session.
 */
export function createPkce() {
  const verifier = crypto.randomBytes(48).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

/** The Microsoft authorize URL the user signs in through. */
export function buildAuthorizeUrl({ clientId, redirectUri, state, codeChallenge }) {
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    response_mode: 'query',
    redirect_uri: redirectUri,
    scope: SCOPE,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    prompt: 'select_account',
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

// ─── HTTP helpers ────────────────────────────────────────────────────────────

async function fetchWithTimeout(url, options = {}) {
  try {
    return await fetch(url, { ...options, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch (err) {
    throw new XboxError(`Xbox request failed: ${err?.message || err}`, {
      kind: 'network',
      reason: 'network_error',
    });
  }
}

async function readJson(res) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** The XBL3.0 authorization header every Xbox Live service expects. */
export function buildAuthHeader(uhs, token) {
  return `XBL3.0 x=${uhs};${token}`;
}

function xblHeaders(authHeader, contractVersion = '2') {
  return {
    Authorization: authHeader,
    Accept: 'application/json',
    'Accept-Language': 'en-US',
    'x-xbl-contract-version': contractVersion,
  };
}

// ─── Token exchange ──────────────────────────────────────────────────────────

async function requestToken(body) {
  const res = await fetchWithTimeout(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body).toString(),
  });

  const data = await readJson(res);
  if (!res.ok) {
    const oauthError = data?.error ? String(data.error) : null;
    const description = data?.error_description || oauthError || `HTTP ${res.status}`;
    // 5xx = Microsoft is having a bad day → transient, not a dead link.
    const kind = res.status >= 500 ? 'network' : 'auth';
    throw new XboxError(`Microsoft token request failed: ${description}`, {
      status: res.status,
      reason: oauthError === 'invalid_grant' ? 'invalid_grant' : 'token_error',
      kind,
      oauthError,
    });
  }
  return data || {};
}

function normalizeTokens(data) {
  const accessToken = String(data.access_token || '');
  const refreshToken = String(data.refresh_token || '');
  if (!accessToken) {
    throw new XboxError('Microsoft did not return an access token', {
      reason: 'token_error',
      kind: 'auth',
    });
  }
  return {
    accessToken,
    refreshToken,
    expiresAt: Date.now() + (Number(data.expires_in) || 3600) * 1000,
  };
}

/** Exchanges the authorization code for MSA access + refresh tokens. */
export async function exchangeCodeForTokens({ code, codeVerifier, redirectUri }) {
  const { clientId, clientSecret } = xboxConfig();
  if (!clientId) {
    throw new XboxError('XBOX_CLIENT_ID is not configured', {
      status: 503,
      reason: 'not_configured',
      kind: 'config',
    });
  }

  const body = {
    client_id: clientId,
    grant_type: 'authorization_code',
    code: String(code || ''),
    redirect_uri: redirectUri,
    scope: SCOPE,
  };
  if (codeVerifier) body.code_verifier = codeVerifier;
  if (clientSecret) body.client_secret = clientSecret;

  return normalizeTokens(await requestToken(body));
}

/** Mints a fresh MSA access token from the stored refresh token. */
export async function refreshMsaToken(refreshToken) {
  const { clientId, clientSecret } = xboxConfig();
  if (!clientId) {
    throw new XboxError('XBOX_CLIENT_ID is not configured', {
      status: 503,
      reason: 'not_configured',
      kind: 'config',
    });
  }

  const body = {
    client_id: clientId,
    grant_type: 'refresh_token',
    refresh_token: String(refreshToken || ''),
    scope: REFRESH_SCOPE,
  };
  if (clientSecret) body.client_secret = clientSecret;

  return normalizeTokens(await requestToken(body));
}

// ─── Xbox Live authentication ────────────────────────────────────────────────

async function postJson(url, payload) {
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'x-xbl-contract-version': '1',
    },
    body: JSON.stringify(payload),
  });
  const data = await readJson(res);
  return { ok: res.ok, status: res.status, data };
}

/** XBL user token (+ the uhs/xid pair that identifies the account). */
export async function xblAuthenticate(msaToken) {
  const payload = {
    Properties: {
      AuthMethod: 'RPS',
      SiteName: 'user.auth.xboxlive.com',
      // MSA v2.0 access tokens must carry the "d=" prefix.
      RpsTicket: `d=${msaToken}`,
    },
    RelyingParty: 'http://auth.xboxlive.com',
    TokenType: 'JWT',
  };

  let res = await postJson(XBL_USER_AUTH_URL, payload);
  if (!res.ok && res.status === 401) {
    // Some tokens are only accepted without the prefix — try once.
    payload.Properties.RpsTicket = msaToken;
    res = await postJson(XBL_USER_AUTH_URL, payload);
  }

  if (!res.ok) {
    throw new XboxError(`Xbox Live authentication failed (HTTP ${res.status})`, {
      status: res.status,
      reason: 'auth_failed',
      kind: res.status >= 500 ? 'network' : 'auth',
    });
  }

  const xui = res.data?.DisplayClaims?.xui?.[0];
  if (!res.data?.Token || !xui?.uhs || !xui?.xid) {
    throw new XboxError('Xbox Live did not return a usable token', {
      reason: 'auth_failed',
      kind: 'auth',
    });
  }

  return { token: res.data.Token, uhs: xui.uhs, xuid: String(xui.xid) };
}

/**
 * XErr codes worth explaining to the user. Everything else falls back to a
 * generic message that still carries the raw code for support.
 */
const XERR_REASONS = {
  '2148916233': {
    reason: 'no_xbox_profile',
    message:
      'This Microsoft account has no Xbox profile yet. Create one at xbox.com, then link again.',
  },
  '2148916238': {
    reason: 'child_account',
    message:
      'This account belongs to a child. An adult has to add it to a Microsoft family before it can be linked.',
  },
};

/** XSTS token — the credential every Xbox Live service actually accepts. */
export async function xstsAuthorize(xblToken) {
  const res = await postJson(XSTS_AUTH_URL, {
    Properties: { SandboxId: 'RETAIL', UserTokens: [xblToken] },
    RelyingParty: 'http://xboxlive.com',
    TokenType: 'JWT',
  });

  if (!res.ok) {
    const xErr = res.data?.XErr ? String(res.data.XErr) : null;
    const known = xErr ? XERR_REASONS[xErr] : null;
    const detail = known
      ? known.message
      : xErr
        ? `Xbox Live authorization failed (XErr ${xErr}).`
        : `Xbox Live authorization failed (HTTP ${res.status}).`;
    throw new XboxError(detail, {
      status: res.status,
      reason: known?.reason ?? 'auth_failed',
      kind: res.status >= 500 ? 'network' : 'auth',
    });
  }

  const xui = res.data?.DisplayClaims?.xui?.[0];
  if (!res.data?.Token || !xui?.uhs || !xui?.xid) {
    throw new XboxError('Xbox Live did not return a usable authorization token', {
      reason: 'auth_failed',
      kind: 'auth',
    });
  }

  return { token: res.data.Token, uhs: xui.uhs, xuid: String(xui.xid) };
}

/**
 * The full chain: MSA token → XBL token → XSTS token.
 * Returns the xuid plus the `XBL3.0` header the library calls need.
 */
export async function authenticateXbox(msaToken) {
  const xbl = await xblAuthenticate(msaToken);
  const xsts = await xstsAuthorize(xbl.token);
  return {
    xuid: xsts.xuid,
    uhs: xsts.uhs,
    authHeader: buildAuthHeader(xsts.uhs, xsts.token),
  };
}

// ─── Library ─────────────────────────────────────────────────────────────────

/** The display name of the account (best effort — the xuid is what matters). */
export async function fetchGamertag(xuid, authHeader) {
  const candidates = [
    `${PEOPLEHUB_URL}/users/me`,
    `${PEOPLEHUB_URL}/users/xuid(${xuid})/profile`,
  ];
  for (const url of candidates) {
    try {
      const res = await fetchWithTimeout(url, { headers: xblHeaders(authHeader, '3') });
      if (!res.ok) continue;
      const data = await readJson(res);
      const gamertag = data?.person?.gamertag ?? data?.gamertag ?? null;
      if (gamertag) return String(gamertag);
    } catch {
      // A missing gamertag must never fail the sign-in.
    }
  }
  return null;
}

/** Recently played titles (titlehub), paged through the continuation token. */
export async function fetchRecentTitles(xuid, authHeader) {
  const titles = [];
  let continuationToken = null;

  for (let page = 0; page < RECENT_PAGE_LIMIT; page += 1) {
    const params = new URLSearchParams({ maxItems: String(RECENT_PAGE_SIZE) });
    if (continuationToken) params.set('continuationToken', continuationToken);

    const url = `${TITLEHUB_URL}/users/xuid(${xuid})/titles/titlehistory/decoration/${TITLE_FIELDS}?${params.toString()}`;
    let res = await fetchWithTimeout(url, { headers: xblHeaders(authHeader) });

    // A rejected decoration list must not kill the whole import — retry with
    // the minimal field set before giving up on the source.
    if (!res.ok && res.status === 400 && page === 0 && !continuationToken) {
      const fallbackUrl = `${TITLEHUB_URL}/users/xuid(${xuid})/titles/titlehistory/decoration/${TITLE_FIELDS_MINIMAL}?${params.toString()}`;
      res = await fetchWithTimeout(fallbackUrl, { headers: xblHeaders(authHeader) });
    }

    if (!res.ok) {
      throw new XboxError(`Xbox title history request failed (HTTP ${res.status})`, {
        status: res.status,
        reason: 'library_error',
        kind: 'library',
      });
    }

    const data = await readJson(res);
    const pageTitles = Array.isArray(data?.titles) ? data.titles : [];
    titles.push(...pageTitles);

    continuationToken = data?.pagingInfo?.continuationToken ?? null;
    if (!continuationToken || pageTitles.length === 0) break;
  }

  return titles;
}

/** Titles the account holds achievements for (achievements service), paged. */
export async function fetchAchievementTitles(xuid, authHeader) {
  const titles = [];
  let continuationToken = null;

  for (let page = 0; page < ACHIEVEMENT_PAGE_LIMIT; page += 1) {
    const params = new URLSearchParams({ maxItems: String(ACHIEVEMENT_PAGE_SIZE) });
    if (continuationToken) params.set('continuationToken', continuationToken);

    const url = `${ACHIEVEMENTS_URL}/users/xuid(${xuid})/history/titles?${params.toString()}`;
    const res = await fetchWithTimeout(url, { headers: xblHeaders(authHeader) });
    if (!res.ok) {
      throw new XboxError(`Xbox achievement history request failed (HTTP ${res.status})`, {
        status: res.status,
        reason: 'library_error',
        kind: 'library',
      });
    }

    const data = await readJson(res);
    const pageTitles = Array.isArray(data?.titles) ? data.titles : [];
    titles.push(...pageTitles);

    continuationToken = data?.pagingInfo?.continuationToken ?? null;
    if (!continuationToken || pageTitles.length === 0) break;
  }

  return titles;
}

/**
 * Is this achievement title worth importing? A demo run that earned one
 * trophy out of fifty is not a game the user owns-and-played.
 */
function isMeaningfulAchievementTitle(title) {
  const titleType = title?.titleType ? String(title.titleType) : null;
  if (titleType && titleType !== 'Game') return false;

  const maxScore = Number(title?.maxGamerscore ?? 0);
  const currentScore = Number(title?.currentGamerscore ?? 0);
  // No achievements at all → the payload is not the shape we expect.
  if (!maxScore) return false;

  const percent = Number(title?.progressPercentage);
  if (Number.isFinite(percent)) return percent >= ACHIEVEMENT_MIN_PERCENT;

  return currentScore / maxScore >= ACHIEVEMENT_MIN_RATIO;
}

/** Normalizes a titlehub entry (recent play) into the wire shape. */
function normalizeRecentTitle(raw) {
  const devices = Array.isArray(raw?.devices) ? raw.devices : [];
  const played = devices
    .map((device) => Date.parse(device?.lastTimeUsed ?? ''))
    .filter((ms) => Number.isFinite(ms));

  const name = raw?.displayName || raw?.gameDisplayName || null;
  if (!name) return null;

  return {
    titleId: raw?.titleId ? String(raw.titleId) : null,
    modernTitleId: raw?.modernTitleId ? String(raw.modernTitleId) : null,
    name: String(name),
    source: 'recent',
    lastPlayedDateTime: played.length ? new Date(Math.max(...played)).toISOString() : null,
  };
}

/** Normalizes an achievement entry into the wire shape (no play date). */
function normalizeAchievementTitle(raw) {
  const name = raw?.name ?? null;
  if (!name) return null;

  return {
    titleId: raw?.titleId ? String(raw.titleId) : null,
    modernTitleId: raw?.modernTitleId ? String(raw.modernTitleId) : null,
    name: String(name),
    source: 'achievements',
    lastPlayedDateTime: null,
  };
}

/**
 * The full library: recently played titles + the achievement titles that show
 * real progress. Duplicates across the two sources are fine — the client
 * de-duplicates by normalized name and prefers the entry with a play date.
 */
export async function fetchXboxLibrary(session) {
  const { xuid, authHeader } = session;

  // Both sources are independent — fetch them in parallel.
  const [recentRaw, achievementRaw] = await Promise.all([
    fetchRecentTitles(xuid, authHeader),
    fetchAchievementTitles(xuid, authHeader),
  ]);

  const recent = recentRaw
    .map(normalizeRecentTitle)
    .filter((title) => title != null);

  const achievements = achievementRaw
    .filter(isMeaningfulAchievementTitle)
    .map(normalizeAchievementTitle)
    .filter((title) => title != null);

  return [...recent, ...achievements];
}
