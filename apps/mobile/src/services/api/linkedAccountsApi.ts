/**
 * Linked-accounts API endpoints proxied through the GamingZone backend.
 *
 * Steam sign-in (OpenID), PSN library import and IGDB name-mapping all live
 * here so `platformSync` / `LinkAccountModal` consume typed functions instead
 * of raw axios calls.
 */
import apiClient from "./client";
import { getBackendIdToken } from "./authToken";
import { logger } from "@/src/lib/logger";
import type {
  IgdbNameMapResponse,
  PsnSyncResponse,
  XboxSyncResponse,
  LinkStateResponse,
  LinkedAccountPlatform,
} from "@/src/features/settings/types";

/** Result of a link-state request — the HTTP status is kept for diagnostics. */
export type LinkStateResult =
  | { ok: true; data: LinkStateResponse }
  | { ok: false; status: number | null; message: string };

/**
 * Fetches a signed linkage `state` (+ the platform-specific start URL) that
 * binds the next link attempt to the authenticated Firebase user for 10 min.
 */
export async function fetchLinkState(
  platform: LinkedAccountPlatform,
): Promise<LinkStateResult> {
  const idToken = await getBackendIdToken();
  if (!idToken) return { ok: false, status: null, message: "no auth session" };
  try {
    const response = await apiClient.get<LinkStateResponse>("/linked-accounts/state", {
      params: { platform },
      headers: { Authorization: `Bearer ${idToken}` },
      timeout: 15_000,
    });
    return { ok: true, data: response.data };
  } catch (error: unknown) {
    // Old deployments fall back to a Play-Store redirect for unknown routes —
    // log the status/body shape so a bad deploy is instantly diagnosable.
    const err = error as { status?: number; data?: unknown; message?: string };
    const body = err?.data;
    const status = typeof err?.status === "number" ? err.status : null;
    logger.error(
      "[linkedAccountsApi] /linked-accounts/state request failed",
      new Error(
        `HTTP ${status ?? "?"} — ${
          typeof body === "string" ? body.slice(0, 120) : (JSON.stringify(body) ?? "").slice(0, 120)
        }`,
      ),
    );
    return {
      ok: false,
      status,
      message: err?.message ?? "state fetch failed",
    };
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
 * Pulls the Xbox library (recently played + achievement titles). The backend
 * refreshes the Microsoft token and walks the Xbox Live chain. `reauth_required`
 * means the stored Microsoft grant is dead — the UI shows the reconnect badge,
 * never an error toast.
 */
export async function syncXboxTitles(): Promise<XboxSyncResponse> {
  const idToken = await getBackendIdToken();
  if (!idToken) return { status: "error" };

  try {
    const response = await apiClient.post<XboxSyncResponse>(
      "/xbox/sync",
      {},
      {
        headers: { Authorization: `Bearer ${idToken}` },
        timeout: 60_000,
      },
    );
    return response.data?.status ? response.data : { status: "error" };
  } catch {
    return { status: "error" };
  }
}

/**
 * Maps a list of titles to IGDB games through the global server-side name
 * cache. The endpoint accepts 200 titles per call, so longer lists are split
 * into chunks and merged (results are aligned with the input order).
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

/** The server caps one name-map call at 200 titles. */
const NAME_MAP_CHUNK_SIZE = 200;

/**
 * Same as `mapTitlesToIgdb` but splits long lists into server-sized chunks —
 * a big Xbox library would otherwise be silently truncated.
 */
export async function mapTitlesToIgdbChunked(
  titles: string[],
): Promise<IgdbNameMapResponse["results"]> {
  if (titles.length <= NAME_MAP_CHUNK_SIZE) return mapTitlesToIgdb(titles);

  const merged: IgdbNameMapResponse["results"] = [];
  for (let i = 0; i < titles.length; i += NAME_MAP_CHUNK_SIZE) {
    const chunk = titles.slice(i, i + NAME_MAP_CHUNK_SIZE);
    merged.push(...(await mapTitlesToIgdb(chunk)));
  }
  return merged;
}
