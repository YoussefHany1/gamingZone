/**
 * Shared constants for every backend → app redirect.
 *
 * They live here — and not inside the components — so the WebView panels, the
 * flow hooks and the deep-link router all speak the exact same URLs and
 * schemes. Changing a redirect scheme in one place must never leave the
 * other side listening for the old value.
 *
 * That registry covers the linked-account (library import) flows and the
 * Discord sign-in callback, which lands here for the same reason: the backend
 * finishes the OAuth handshake and hands control back through a custom scheme.
 */

/** The backend redirects back into the app with this scheme after Steam linking. */
export const STEAM_REDIRECT = "gaming-zone://steam-link";

/** The backend redirects back into the app with this scheme after Xbox linking. */
export const XBOX_REDIRECT = "gaming-zone://xbox-link";

/**
 * The backend redirects back into the app with this scheme after Discord
 * sign-in (`?status=success&code=…` | `?status=error&reason=…`). Must match
 * `APP_REDIRECT` in apps/backend/api/discordAuth.js.
 */
export const DISCORD_REDIRECT = "gaming-zone://discord-auth";

/**
 * Sony's ssocookie endpoint NEVER shows a login form — without an active
 * PlayStation session it just dumps `{"error":"invalid_grant","error_code":20}`.
 * (store.playstation.com's "pages/signin" route is also dead — it renders a 404.)
 * The WebView therefore opens the session sign-in endpoint used by every PSN
 * library tool: it lands on the real `my.account.sony.com` login form (2FA
 * supported) and, post-login, bounces through to the ssocookie page where the
 * injected probe reads the NPSSO automatically.
 */
export const PSN_COOKIE_URL = "https://ca.account.sony.com/api/v1/ssocookie";

export const PSN_SIGNIN_URL =
  "https://web.np.playstation.com/api/session/v1/signin?redirect_uri=https%3A%2F%2Fio.playstation.com%2Fcentral%2Fauth%2Flogin%3FpostSignInURL%3Dhttps%253A%252F%252Fca.account.sony.com%252Fapi%252Fv1%252Fssocookie";

/**
 * A real mobile-Chrome user agent — the default RN WebView agent string is a
 * trivially detectable "bot" signature which can trigger Sony's FunCaptcha or
 * outright blocks inside embedded sessions. Microsoft flags it just as often.
 */
export const MOBILE_CHROME_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";
