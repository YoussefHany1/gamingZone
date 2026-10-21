/**
 * Linked-accounts API endpoints proxied through the GamingZone backend.
 *
 * Steam sign-in (OpenID), PSN library import and IGDB name-mapping all live
 * here so `platformSync` / `LinkAccountModal` consume typed functions instead
 * of raw axios calls.
 */
import apiClient from "./client";
import { logger } from "@/src/lib/logger";
import type {
  IgdbNameMapResponse,
  PsnSyncResponse,
  LinkStateResponse,
} from "@/src/features/settings/types";

/** Returns a valid, capped Firebase ID token for backend auth. */
export async function getBackendIdToken(): Promise<string | null> {
  try {
    const { default: auth } = await import("@react-native-firebase/auth");
    const user = auth().currentUser;
    if (!user) {
      logger.warn(
        "[linkedAccountsApi] getBackendIdToken: no auth().currentUser — user not signed in",
      );
      return null;
    }
    return await user.getIdToken();
  } catch (error: unknown) {
    logger.error("[linkedAccountsApi] getBackendIdToken failed", error as Error);
    return null;
  }
}

/**
 * Fetches a signed linkage `state` (+ the platform-specific start URL) that
 * binds the next link attempt to the authenticated Firebase user for 10 min.
 */
export async function fetchLinkState(
  platform: "steam" | "psn",
): Promise<LinkStateResponse | null> {
  const idToken = await getBackendIdToken();
  if (!idToken) return null;
  try {
    const response = await apiClient.get<LinkStateResponse>("/linked-accounts/state", {
      params: { platform },
      headers: { Authorization: `Bearer ${idToken}` },
      timeout: 15_000,
    });
    return response.data ?? null;
  } catch (error: unknown) {
    // Old deployments fall back to a Play-Store redirect for unknown routes —
    // log the status/body shape so a bad deploy is instantly diagnosable.
    const err = error as {
      response?: { status?: number; data?: unknown };
    };
    const body = err?.response?.data;
    logger.error(
      "[linkedAccountsApi] /linked-accounts/state request failed",
      err?.response?.status != null
        ? new Error(
            `HTTP ${err.response.status} — ${
              typeof body === "string" ? body.slice(0, 120) : JSON.stringify(body)?.slice(0, 120)
            }`,
          )
        : (error as Error),
    );
    return null;
  }
}

/** Exchanges a one-time NPSSO token for a stored (server-side) PSN link. */
export async function linkPsnAccount(npsso: string): Promise<
  { ok: true; onlineId: string | null } | { ok: false; message?: string }
> {
  const idToken = await getBackendIdToken();
  if (!idToken) return { ok: false };

  try {
    const response = await apiClient.post(
      "/psn/link",
      { npsso: npsso.trim() },
      {
        headers: { Authorization: `Bearer ${idToken}` },
        timeout: 30_000,
      },
    );
    return { ok: true, onlineId: response.data?.onlineId ?? null };
  } catch (error: unknown) {
    const rawMessage = (
      error as { response?: { data?: { message?: unknown } } }
    )?.response?.data?.message;
    if (typeof rawMessage === "string") return { ok: false, message: rawMessage };
    return { ok: false };
  }
}

/**
 * Pulls the played PSN titles. `reauth_required` means the refresh token
 * expired — the UI should show the reconnect badge, never an error toast.
 */
export async function syncPsnTitles(): Promise<PsnSyncResponse> {
  const idToken = await getBackendIdToken();
  if (!idToken) return { status: "error" };

  try {
    const response = await apiClient.post<PsnSyncResponse>(
      "/psn/sync",
      {},
      {
        headers: { Authorization: `Bearer ${idToken}` },
        timeout: 30_000,
      },
    );
    return response.data?.status ? response.data : { status: "error" };
  } catch {
    return { status: "error" };
  }
}

/**
 * Maps a list of (PSN) titles to IGDB games through the global server-side
 * name cache. Returns results aligned with the input order.
 */
export async function mapTitlesToIgdb(
  titles: string[],
): Promise<IgdbNameMapResponse["results"]> {
  if (titles.length === 0) return [];
  const idToken = await getBackendIdToken();
  if (!idToken) return [];

  try {
    // Library syncs are slow by nature; the server paces IGDB chunks itself.
    const response = await apiClient.post<IgdbNameMapResponse>(
      "/igdb/map-by-names",
      { titles },
      {
        headers: { Authorization: `Bearer ${idToken}` },
        timeout: 120_000,
      },
    );
    return Array.isArray(response.data?.results) ? response.data.results : [];
  } catch {
    return [];
  }
}
