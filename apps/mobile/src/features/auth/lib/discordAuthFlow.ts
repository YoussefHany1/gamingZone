/**
 * Discord OAuth flow shared by sign-in and account re-authentication.
 *
 * Flow: `POST /auth/discord/start` → browser → Discord consent → the backend
 * redirects to `gaming-zone://discord-auth?code=…` → `POST /auth/discord/exchange`.
 * The exchanged custom token is returned to the caller, which decides whether
 * to sign in or re-authenticate the current user.
 *
 * ── Why a race instead of a plain `openAuthSessionAsync` result ──────────────
 * On Android `expo-web-browser` has no native auth session — it races
 * `AppState` "active" against the `Linking` "url" event in JS. When the Custom
 * Tab returns to the app both fire, in an order that is not guaranteed, so the
 * promise's own result is unreliable:
 *
 *  - `success` is always trustworthy → use it immediately.
 *  - `dismiss` is ambiguous (cancel *or* a deep link that has not been
 *    dispatched yet) → keep listening for a short grace period. A genuine
 *    cancel is only reported after that window closes, and a slow device still
 *    wins as soon as its deep link arrives.
 *
 * A 5 minute cap guarantees the flow can never hang forever.
 */
import { Linking } from "react-native";
import { DISCORD_REDIRECT } from "@/src/features/linking/lib/constants";
import {
  decodeQueryValue,
  readQueryParam,
} from "@/src/features/linking/lib/callbackQuery";
import { exchangeDiscordCode, startDiscordAuth } from "@/src/services/api/discordAuthApi";
import { logger } from "@/src/lib/logger";

export type DiscordAuthFlowResult =
  | { status: "success"; customToken: string }
  | { status: "cancelled" }
  | { status: "not_configured" }
  | { status: "failed" };

/** How long a dismissed browser waits for a deep link before it counts as a cancel. */
const DISMISS_GRACE_MS = 3_000;

/** Absolute cap so a browser that never returns cannot leave the UI spinning. */
const FLOW_TIMEOUT_MS = 5 * 60 * 1000;

/** One flow at a time, app-wide — guards double taps and two mounted screens. */
let flowInProgress = false;

/**
 * The launch URL is re-delivered by `Linking.getInitialURL()` on every call, so
 * a redeemed code must be remembered to keep a later attempt from trying to
 * spend it again.
 */
let consumedInitialUrl: string | null = null;

type DiscordCallback = { status: string; code: string; reason: string };

type BrowserOutcome = { type?: string; url?: string };

/** Parses `gaming-zone://discord-auth?…`, or null for any other deep link. */
function parseDiscordCallback(url: string | null | undefined): DiscordCallback | null {
  if (!url) return null;
  // Compare without the query *and* without trailing slashes, so
  // `gaming-zone://discord-auth-evil` can never be mistaken for the callback.
  const base = (url.split("?")[0] ?? "").replace(/\/+$/, "");
  if (base !== DISCORD_REDIRECT) return null;
  return {
    status: decodeQueryValue(readQueryParam(url, "status")),
    code: decodeQueryValue(readQueryParam(url, "code")),
    reason: decodeQueryValue(readQueryParam(url, "reason")),
  };
}

/**
 * Opens Discord in an in-app browser session. Falls back to a plain browser
 * tab (and then to the system browser) — the deep link brings the app back
 * either way.
 */
function openDiscordBrowser(startUrl: string): Promise<BrowserOutcome> {
  try {
    // Deliberately dynamic, for the same reason as src/lib/browser.ts: a
    // top-level `import` is evaluated at module load and crashes builds where
    // the native module is absent.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const WebBrowser = require("expo-web-browser");
    if (typeof WebBrowser?.openAuthSessionAsync === "function") {
      return WebBrowser.openAuthSessionAsync(startUrl, DISCORD_REDIRECT);
    }
    if (typeof WebBrowser?.openBrowserAsync === "function") {
      return WebBrowser.openBrowserAsync(startUrl, { createTask: false }).then(() => ({
        type: "dismiss",
      }));
    }
  } catch (error) {
    logger.warn("[DiscordAuth] expo-web-browser unavailable, using Linking", error);
  }

  return Linking.openURL(startUrl).then(
    () => ({ type: "dismiss" }),
    () => ({ type: "dismiss" }),
  );
}

/**
 * Runs the whole Discord handshake and returns the freshly minted custom token.
 * The caller is responsible for redeeming it (sign-in or re-authentication).
 */
export async function runDiscordAuthFlow(): Promise<DiscordAuthFlowResult> {
  if (flowInProgress) return { status: "failed" };
  flowInProgress = true;

  let settled = false;
  let finish: (callback: DiscordCallback | null) => void = () => {};
  const outcome = new Promise<DiscordCallback | null>((resolve) => {
    finish = resolve;
  });

  /** First callback wins: a stray second deep link must not re-open the flow. */
  const settle = (callback: DiscordCallback | null): void => {
    if (settled) return;
    settled = true;
    subscription.remove();
    finish(callback);
  };

  const subscription = Linking.addEventListener("url", ({ url }) => {
    const callback = parseDiscordCallback(url);
    if (callback) settle(callback);
  });

  const safety = setTimeout(() => settle(null), FLOW_TIMEOUT_MS);

  try {
    // Cold start: the browser may have killed the app and the callback then
    // arrives as the launch URL instead of a "url" event.
    const initialUrl = await Linking.getInitialURL().catch(() => null);
    if (initialUrl && initialUrl !== consumedInitialUrl) {
      const callback = parseDiscordCallback(initialUrl);
      if (callback) {
        consumedInitialUrl = initialUrl;
        settle(callback);
      }
    }

    if (!settled) {
      const start = await startDiscordAuth();
      if (!start.ok) {
        logger.error(
          "[DiscordAuth] /auth/discord/start failed",
          new Error(`HTTP ${start.status ?? "?"} — ${start.message}`),
        );
        return { status: start.status === 503 ? "not_configured" : "failed" };
      }

      const session = await openDiscordBrowser(start.startUrl);
      if (session?.type === "success" && session.url) {
        const callback = parseDiscordCallback(session.url);
        if (callback) settle(callback);
      }

      // The tab closed (or returned "success" without a usable URL): give
      // the deep link its grace period before calling it a cancel.
      if (!settled) {
        await Promise.race([
          outcome,
          new Promise<void>((resolve) => setTimeout(resolve, DISMISS_GRACE_MS)),
        ]);
      }
    }

    // No-op when a callback already won; otherwise this is a genuine cancel.
    settle(null);
    const callback = await outcome;

    // Cancelled — nothing to report.
    if (!callback) return { status: "cancelled" };

    if (callback.status !== "success") {
      // "Cancel" on Discord's consent screen is a user decision, not an error.
      if (callback.reason === "access_denied" || callback.reason === "cancel") {
        return { status: "cancelled" };
      }
      logger.error(
        "[DiscordAuth] callback failed",
        new Error(callback.reason || "unknown reason"),
      );
      return {
        status: callback.reason === "not_configured" ? "not_configured" : "failed",
      };
    }

    if (!callback.code) {
      logger.error("[DiscordAuth] callback carried no exchange code");
      return { status: "failed" };
    }

    const exchange = await exchangeDiscordCode(callback.code);
    if (!exchange.ok) {
      logger.error(
        "[DiscordAuth] /auth/discord/exchange failed",
        new Error(`HTTP ${exchange.status ?? "?"} — ${exchange.message}`),
      );
      return { status: "failed" };
    }

    return { status: "success", customToken: exchange.customToken };
  } catch (error) {
    logger.error("[DiscordAuth] flow failed", error);
    return { status: "failed" };
  } finally {
    clearTimeout(safety);
    subscription.remove();
    settled = true;
    flowInProgress = false;
  }
}
