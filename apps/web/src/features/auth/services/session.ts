import type { User } from "firebase/auth";

/**
 * Exchanges a Firebase ID token for an httpOnly session cookie
 * (set by the /api/auth/session route).
 */
export async function createSessionCookie(
  idToken: string,
): Promise<{ ok: boolean }> {
  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  return { ok: response.ok };
}

/** Convenience overload for the current Firebase user. */
export async function createSessionFromUser(user: User): Promise<boolean> {
  const idToken = await user.getIdToken();
  const { ok } = await createSessionCookie(idToken);
  return ok;
}
