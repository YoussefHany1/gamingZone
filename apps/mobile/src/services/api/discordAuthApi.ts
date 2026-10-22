/**
 * Discord sign-in endpoints.
 *
 * Discord has no mobile sign-in SDK and Firebase has no `discord.com` provider,
 * so the backend owns the OAuth handshake and mints a Firebase custom token.
 * The app only ever handles: a start URL, a one-time code, and that token.
 */
import apiClient from "./client";
import { getBackendIdToken } from "./authToken";
import { logger } from "@/src/lib/logger";

export type StartDiscordAuthResult =
  | { ok: true; startUrl: string }
  | { ok: false; status: number | null; message: string };

export type ExchangeDiscordCodeResult =
  | { ok: true; customToken: string }
  | { ok: false; status: number | null; message: string };

/** Pulls a `message` out of an axios rejection without trusting its shape. */
function messageOf(error: unknown): string {
  const err = error as {
    message?: string;
    response?: { data?: { message?: unknown } };
  };
  const raw = err?.response?.data?.message;
  if (typeof raw === "string" && raw) return raw;
  return err?.message ?? "request failed";
}

const statusOf = (error: unknown): number | null => {
  const status = (error as { status?: unknown })?.status;
  return typeof status === "number" ? status : null;
};

/**
 * Asks the backend for a signed Discord authorize URL. Requires the caller's
 * Firebase ID token: the signed `state` is bound to it, so the callback knows
 * whose account may be upgraded in place.
 */
export async function startDiscordAuth(): Promise<StartDiscordAuthResult> {
  const idToken = await getBackendIdToken();
  if (!idToken) return { ok: false, status: null, message: "no auth session" };

  try {
    const response = await apiClient.post<{ startUrl?: string }>(
      "/auth/discord/start",
      {},
      {
        headers: { Authorization: `Bearer ${idToken}` },
        timeout: 15_000,
      },
    );

    const startUrl = response.data?.startUrl;
    // Never hand an arbitrary scheme to the browser helper.
    if (typeof startUrl !== "string" || !startUrl.startsWith("https://")) {
      logger.error("[discordAuthApi] /auth/discord/start returned no usable URL");
      return { ok: false, status: response.status, message: "invalid start URL" };
    }
    return { ok: true, startUrl };
  } catch (error: unknown) {
    const status = statusOf(error);
    logger.error(
      "[discordAuthApi] /auth/discord/start failed",
      new Error(`HTTP ${status ?? "?"} — ${messageOf(error)}`),
    );
    return { ok: false, status, message: messageOf(error) };
  }
}

/**
 * Redeems the one-time code carried by the deep link. The server deletes the
 * code on read, so this must be called exactly once per sign-in.
 */
export async function exchangeDiscordCode(
  code: string,
): Promise<ExchangeDiscordCodeResult> {
  const trimmed = code.trim();
  if (!trimmed) return { ok: false, status: null, message: "missing code" };

  try {
    const response = await apiClient.post<{ customToken?: string }>(
      "/auth/discord/exchange",
      { code: trimmed },
      { timeout: 15_000 },
    );

    const customToken = response.data?.customToken;
    if (typeof customToken !== "string" || !customToken) {
      logger.error("[discordAuthApi] /auth/discord/exchange returned no token");
      return { ok: false, status: response.status, message: "missing token" };
    }
    return { ok: true, customToken };
  } catch (error: unknown) {
    const status = statusOf(error);
    logger.error(
      "[discordAuthApi] /auth/discord/exchange failed",
      new Error(`HTTP ${status ?? "?"} — ${messageOf(error)}`),
    );
    return { ok: false, status, message: messageOf(error) };
  }
}
