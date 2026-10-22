/**
 * Shared OAuth `state` helpers.
 *
 * Both the linked-account flows (`linkedAccounts.js`) and the Discord sign-in
 * flow (`discordAuth.js`) bind a short-lived, tamper-proof intent to a Firebase
 * UID. Keeping one implementation means the wire format can never drift between
 * the two: a state minted for one flow cannot be replayed into the other, and
 * a change to the TTL or the signing key only ever has to be made here.
 *
 * Format: `base64url("<uid>|<platform>|<expiresAt>[|<extra>]") + "." + HMAC-SHA256`
 *
 * `extra` carries adapter-specific payload (the Xbox PKCE verifier) inside the
 * signed blob — no server-side session is needed to finish the handshake.
 */
import crypto from 'crypto';

const linkSecret = () => process.env.SERVER_SECRET || process.env.RSS_SECRET || '';

export const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/** Mints a signed, time-limited state bound to `uid` and `platform`. */
export function createLinkState(uid, platform, extra = '') {
  const expiresAt = Date.now() + STATE_TTL_MS;
  const payload = `${uid}|${platform}|${expiresAt}${extra ? `|${extra}` : ''}`;
  const body = Buffer.from(payload).toString('base64url');
  const sig = crypto.createHmac('sha256', linkSecret()).update(payload).digest('base64url');
  return `${body}.${sig}`;
}

/**
 * Returns `{ uid, extra }` for a good/untampered state, or null when the
 * state is missing, expired, signed for another platform or forged.
 */
export function verifyLinkState(state, platform) {
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

  const [uid, platformInState, expiresAtRaw, ...rest] = payload.split('|');
  if (!uid || platformInState !== platform) return null;
  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return null;
  return { uid, extra: rest.join('|') };
}
