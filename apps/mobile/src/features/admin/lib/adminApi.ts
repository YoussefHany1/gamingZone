/**
 * Authenticated client for the admin endpoints on the Vercel backend.
 *
 * Same contract as `socialApi.ts`: a Firebase ID token in `Authorization`, and
 * `{ message, code }` on 4xx so the UI can translate `code`.
 *
 * The backend re-verifies the `admin` claim on every request. A `403
 * admin_required` also invalidates the client-side claim cache so the Settings
 * row disappears immediately after a demotion.
 */
import apiClient from "@/src/services/api/client";
import { getBackendIdToken } from "@/src/services/api/authToken";
import { invalidateAdminAccessCache } from "@/src/hooks/useIsAdmin";
import type {
  AdminAuditEntry,
  AdminOverview,
  AdminRange,
  AdminUserDetail,
  AdminUserFilter,
  AdminUsersPage,
} from "../types";

/** A rejected admin call, carrying the backend's machine-readable `code`. */
export class AdminApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "AdminApiError";
    this.status = status;
    this.code = code;
  }
}

function toAdminApiError(error: unknown): AdminApiError {
  const err = error as { status?: number; data?: unknown; message?: string };
  const data = err.data as { message?: string; code?: string } | undefined;

  const normalized = new AdminApiError(
    data?.message ?? err.message ?? "Request failed",
    typeof err.status === "number" ? err.status : 0,
    data?.code,
  );

  if (normalized.status === 403 && normalized.code === "admin_required") {
    invalidateAdminAccessCache();
  }

  return normalized;
}

async function authHeaders(): Promise<{ Authorization: string }> {
  const token = await getBackendIdToken();
  if (!token) {
    throw new AdminApiError("You must be signed in", 401, "unauthenticated");
  }
  return { Authorization: `Bearer ${token}` };
}

async function request<T>(
  method: "get" | "post",
  path: string,
  options: { body?: Record<string, unknown>; params?: Record<string, unknown> } = {},
): Promise<T> {
  const headers = await authHeaders();
  try {
    const response =
      method === "post"
        ? await apiClient.post<T>(path, options.body, { headers })
        : await apiClient.get<T>(path, { headers, params: options.params });
    return response.data;
  } catch (error: unknown) {
    throw toAdminApiError(error);
  }
}

export async function fetchAdminOverview(range: AdminRange): Promise<AdminOverview> {
  const data = await request<{ ok: true } & AdminOverview>("get", "/admin/overview", {
    params: { range },
  });
  return data;
}

export type AdminUsersQuery = {
  query?: string;
  filter?: AdminUserFilter;
  cursor?: string | null;
  limit?: number;
};

export function fetchAdminUsers({
  query = "",
  filter = "all",
  cursor = null,
  limit = 25,
}: AdminUsersQuery): Promise<AdminUsersPage> {
  return request<AdminUsersPage & { ok: true }>("get", "/admin/users", {
    params: {
      ...(query ? { query } : {}),
      filter,
      ...(cursor ? { cursor } : {}),
      limit,
    },
  });
}

export async function fetchAdminUser(uid: string): Promise<AdminUserDetail> {
  const data = await request<{ ok: true } & AdminUserDetail>(
    "get",
    `/admin/users/${encodeURIComponent(uid)}`,
  );
  return data;
}

export function setAdminRole(uid: string, enabled: boolean): Promise<{ isAdmin: boolean }> {
  return request("post", `/admin/users/${encodeURIComponent(uid)}/admin`, {
    body: { enabled },
  });
}

export function setUserDisabled(
  uid: string,
  disabled: boolean,
): Promise<{ disabled: boolean }> {
  return request("post", `/admin/users/${encodeURIComponent(uid)}/disabled`, {
    body: { disabled },
  });
}

export async function fetchAdminAudit(limit = 50): Promise<AdminAuditEntry[]> {
  const data = await request<{ ok: true; entries: AdminAuditEntry[] }>("get", "/admin/audit", {
    params: { limit },
  });
  return data.entries;
}
