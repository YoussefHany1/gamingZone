/**
 * Authenticated client for the social endpoints on the Vercel backend.
 *
 * The trusted writes for the social layer (handle reservation, public link
 * projection) used to be Firebase callables. Cloud Functions v2 require the
 * Blaze plan, so they now live next to the existing linked-accounts API, which
 * the app already talks to. The contract mirrors `accountDeletion`'s: a
 * Firebase ID token in `Authorization`, and `{ message, code }` on 4xx so the
 * UI can translate `code` instead of rendering an English message.
 */
import apiClient from "@/src/services/api/client";
import { getBackendIdToken } from "@/src/services/api/authToken";

/** A rejected social call, carrying the backend's machine-readable `code`. */
export class SocialApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "SocialApiError";
    this.status = status;
    this.code = code;
  }
}

/**
 * `apiClient`'s interceptor keeps the status and body on the rejection so the
 * endpoint's `code` survives (see services/api/client.ts).
 */
function toSocialApiError(error: unknown): SocialApiError {
  const err = error as { status?: number; data?: unknown; message?: string };
  const data = err.data as { message?: string; code?: string } | undefined;

  return new SocialApiError(
    data?.message ?? err.message ?? "Request failed",
    typeof err.status === "number" ? err.status : 0,
    data?.code,
  );
}

async function authHeaders(): Promise<{ Authorization: string }> {
  const token = await getBackendIdToken();
  if (!token) {
    throw new SocialApiError("You must be signed in", 401, "unauthenticated");
  }
  return { Authorization: `Bearer ${token}` };
}

/** POSTs JSON to a social endpoint. Throws {@link SocialApiError} on failure. */
export async function callSocialApi<T>(
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  const headers = await authHeaders();
  try {
    const response = await apiClient.post<T>(path, body, { headers });
    return response.data;
  } catch (error: unknown) {
    throw toSocialApiError(error);
  }
}

/**
 * GETs a social endpoint. Read-only endpoints (`/social/search`) are registered
 * as GET on the backend, so they must not go through the POST helper.
 */
export async function callSocialApiGet<T>(path: string): Promise<T> {
  const headers = await authHeaders();
  try {
    const response = await apiClient.get<T>(path, { headers });
    return response.data;
  } catch (error: unknown) {
    throw toSocialApiError(error);
  }
}
