/**
 * Client-side public-profile service.
 *
 * The handle itself is server-owned: it is reserved through `POST
 * /social/handle` on the Vercel backend (which also creates `profiles/{uid}`),
 * so the client never writes `handle`/`handleLower` or `usernames/*`. Everything
 * else in this module is the owner-writable projection, constrained by the
 * Firestore rules to the safe field set.
 */
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import {
  clampProfileText,
  handleCandidates,
  PROFILE_BIO_MAX_LENGTH,
  PROFILE_DISPLAY_NAME_MAX_LENGTH,
  PROFILE_STATUS_MAX_LENGTH,
  type ProfilePrivacy,
} from "@gaming-zone/core";
import { auth, db } from "@/lib/firebase";
import { getServerApiUrl } from "@/lib/api-config";

/** A rejected backend call, carrying the API's machine-readable `code`. */
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

/** Calls an authenticated social endpoint on the backend. */
export async function postSocial<T>(path: string, body: unknown): Promise<T> {
  const user = auth.currentUser;
  if (!user) {
    throw new SocialApiError("You must be signed in", 401, "unauthenticated");
  }

  const token = await user.getIdToken();
  const response = await fetch(`${getServerApiUrl()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string; code?: string }
    | null;

  if (!response.ok) {
    throw new SocialApiError(
      payload?.message ?? `Request failed (${response.status})`,
      response.status,
      payload?.code,
    );
  }

  return payload as T;
}

/** Fields the owner may personalise on `profiles/{uid}`. */
export type PublicProfilePatch = {
  displayName?: string;
  photoURL?: string | null;
  bannerURL?: string | null;
  bio?: string;
  status?: { text: string; emoji: string } | null;
  platform?: string;
  country?: string;
  privacy?: ProfilePrivacy;
};

/**
 * True when the handle claim was rejected because another account owns it.
 *
 * The backend answers 409 with `{ code: "handle_taken" }`; the message checks
 * are kept so an older deployment that only surfaced text still maps correctly.
 */
export function isHandleTakenError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;

  const { code, message, status } = error as {
    code?: unknown;
    message?: unknown;
    status?: unknown;
  };
  return (
    code === "handle_taken" ||
    status === 409 ||
    message === "handle_taken" ||
    (typeof message === "string" && message.includes("handle_taken"))
  );
}

/** Claims `handle` for the signed-in user. Returns the canonical lowercase form. */
export async function claimHandle(handle: string): Promise<string> {
  const result = await postSocial<{ handle: string }>("/social/handle", { handle });
  return result.handle;
}

/**
 * Claims the first free auto-generated candidate for a display name.
 *
 * Collisions need the same name *and* the same uid prefix, but they are still
 * possible — walking the list keeps bootstrap from failing over one. Returns
 * `null` when every candidate is taken.
 */
export async function claimGeneratedHandle(
  displayName: string,
  uid: string,
): Promise<string | null> {
  for (const candidate of handleCandidates(displayName, uid)) {
    try {
      return await claimHandle(candidate);
    } catch (error) {
      if (isHandleTakenError(error)) continue;
      throw error;
    }
  }
  return null;
}

/**
 * Ensures the signed-in account owns a profile + handle.
 *
 * Registration claims one explicitly; this covers Google sign-in, accounts
 * created before Phase 1, and a registration whose request failed because the
 * backend was briefly unreachable. A no-op once `profiles/{uid}` exists *and*
 * carries a handle.
 */
export async function ensurePublicProfile(uid: string, displayName: string): Promise<void> {
  const snapshot = await getDoc(doc(db, "profiles", uid));

  // A document with no handle is a half-written claim (the backend call failed
  // between the profile write and the reservation). Claiming is idempotent for
  // the current owner, so retrying is safe.
  const handle = (snapshot.data() as { handleLower?: unknown } | undefined)?.handleLower;
  if (typeof handle === "string" && handle) return;

  const claimed = await claimGeneratedHandle(displayName, uid);
  if (!claimed) {
    throw new Error("No free handle candidate for this account");
  }
}

/**
 * Updates the owner-writable part of the public profile.
 *
 * Only the keys present in `patch` are written; `updatedAt` must equal
 * `request.time` for the rules to accept the update.
 */
export async function updateMyPublicProfile(
  uid: string,
  patch: PublicProfilePatch,
): Promise<void> {
  const data: Record<string, unknown> = { updatedAt: serverTimestamp() };

  if (patch.displayName !== undefined) {
    data.displayName =
      clampProfileText(patch.displayName, PROFILE_DISPLAY_NAME_MAX_LENGTH) || "Player";
  }
  if (patch.photoURL !== undefined) data.photoURL = patch.photoURL;
  if (patch.bannerURL !== undefined) data.bannerURL = patch.bannerURL;
  if (patch.bio !== undefined) {
    data.bio = clampProfileText(patch.bio, PROFILE_BIO_MAX_LENGTH);
  }
  if (patch.platform !== undefined) data.platform = patch.platform;
  if (patch.country !== undefined) data.country = patch.country;
  if (patch.privacy !== undefined) {
    data.privacy = {
      discoverable: patch.privacy.discoverable,
      showLinks: patch.privacy.showLinks,
      showStats: patch.privacy.showStats,
    };
  }
  if (patch.status !== undefined) {
    data.status = patch.status
      ? {
          text: clampProfileText(patch.status.text, PROFILE_STATUS_MAX_LENGTH),
          emoji: clampProfileText(patch.status.emoji, 8),
          updatedAt: serverTimestamp(),
        }
      : null;
  }

  await updateDoc(doc(db, "profiles", uid), data);
}
