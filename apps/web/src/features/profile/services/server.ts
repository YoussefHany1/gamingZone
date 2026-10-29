import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import { mapPublicProfile, normalizeHandle, type PublicProfile } from "@gaming-zone/core";

/**
 * Reads one public profile by handle for `/u/[handle]`.
 *
 * Server-side on purpose: the query is a direct read of `profiles`, so it does
 * not need a signed-in Firestore client, and the page can render without waiting
 * for auth. Returns `null` for a missing handle, a profile without a handle, or
 * one that opted out of discovery — the page turns all three into a 404.
 *
 * Blocking (`blockedPairs`) is enforced for client reads by the Firestore
 * rules; this server path does not know the reader, so it is added when the
 * block endpoints ship in Phase 2.
 */
export async function getPublicProfileByHandle(handle: string): Promise<PublicProfile | null> {
  const normalized = normalizeHandle(handle);
  if (!normalized) return null;

  try {
    const snapshot = await getAdminDb()
      .collection("profiles")
      .where("handleLower", "==", normalized)
      .limit(1)
      .get();

    const document = snapshot.docs[0];
    if (!document) return null;

    const profile = mapPublicProfile(document.id, document.data());
    if (!profile || !profile.privacy.discoverable) return null;

    return profile;
  } catch (error) {
    console.error("[getPublicProfileByHandle] profile lookup failed:", error);
    return null;
  }
}
