/**
 * Account deletion endpoint.
 *
 * The deletion itself is server-side: the Admin SDK removes the Auth user plus
 * every user-owned document (`users/{uid}` and its subcollections,
 * `linkedAccountSecrets/{uid}`, `discordAccounts` mappings). The client only
 * supplies a freshly verified session and reports the outcome.
 */
import apiClient from "./client";
import { getBackendIdToken } from "./authToken";
import auth from "@react-native-firebase/auth";
import { logger } from "@/src/lib/logger";

export type DeleteAccountFailureReason =
  /** The session is valid but too old; the user has to re-authenticate. */
  | "requires_recent_login"
  /** No session at all, or the token was rejected. */
  | "unauthenticated"
  /** The backend is unreachable or not configured for deletions. */
  | "unavailable"
  /** Anything else (unexpected status, partial failure). */
  | "failed";

export type DeleteAccountResult =
  { ok: true } | { ok: false; reason: DeleteAccountFailureReason; status: number | null };

const statusOf = (error: unknown): number | null => {
  const status = (error as { status?: unknown })?.status;
  return typeof status === "number" ? status : null;
};

/** Reads the optional `code` from a normalised axios rejection body. */
function codeOf(error: unknown): string | null {
  const data = (error as { data?: unknown })?.data;
  if (!data || typeof data !== "object") return null;
  const code = (data as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

/**
 * Requests deletion of the signed-in account.
 *
 * The token is force-refreshed: a re-authentication a moment earlier updates
 * `auth_time`, and the server only sees that in a newly minted token.
 *
 * Never throws — callers switch on the returned reason.
 */
export async function deleteAccount(): Promise<DeleteAccountResult> {
  const idToken = await getBackendIdToken({ forceRefresh: true });
  if (!idToken) {
    // A signed-in user without a token means the refresh failed (network), not
    // that there is no session — the two need different messages after a
    // successful re-authentication.
    return {
      ok: false,
      reason: auth().currentUser ? "unavailable" : "unauthenticated",
      status: null,
    };
  }

  try {
    await apiClient.post(
      "/account/delete",
      {},
      {
        headers: { Authorization: `Bearer ${idToken}` },
        // `recursiveDelete` has to walk every list/game document, so this can
        // take noticeably longer than the client's default 10s.
        timeout: 20_000,
      },
    );
    return { ok: true };
  } catch (error: unknown) {
    const status = statusOf(error);
    const code = codeOf(error);
    logger.error(
      "[accountApi] /account/delete failed",
      new Error(`HTTP ${status ?? "?"} — ${code ?? "unknown"}`),
    );

    if (code === "requires_recent_login" || status === 403) {
      return { ok: false, reason: "requires_recent_login", status };
    }
    if (status === 401) return { ok: false, reason: "unauthenticated", status };
    if (status === 503 || status === 0) {
      return { ok: false, reason: "unavailable", status };
    }
    return { ok: false, reason: "failed", status };
  }
}
