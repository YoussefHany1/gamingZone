import firestore from "@react-native-firebase/firestore";
import {
  clampProfileText,
  PROFILE_BIO_MAX_LENGTH,
  PROFILE_DISPLAY_NAME_MAX_LENGTH,
  PROFILE_STATUS_MAX_LENGTH,
  type ProfileLinkPlatform,
  type ProfilePrivacy,
} from "@gaming-zone/core";
import { handleCandidates, isHandleTakenError } from "./handles";
import { callSocialApi } from "./socialApi";

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
 * Claims `handle` for the signed-in user.
 *
 * The backend creates the profile if it does not exist yet, so this is also the
 * bootstrap path used at registration and by `useProfileBootstrap`.
 */
export async function claimHandle(handle: string): Promise<string> {
  const result = await callSocialApi<{ handle: string }>("/social/handle", { handle });
  return result.handle;
}

/**
 * Claims the first free auto-generated candidate for a display name.
 *
 * Collisions need the same name *and* the same uid prefix, but they are still
 * possible — walking the list keeps registration from failing over one.
 * Returns `null` when every candidate is taken (only reachable with a
 * pathological name/uid, or a broken deployment).
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
 * Updates the owner-writable part of the public profile.
 *
 * Only the keys present in `patch` are written; `updatedAt` must equal
 * `request.time` for the rules to accept the update.
 */
export async function updateMyPublicProfile(
  uid: string,
  patch: PublicProfilePatch,
): Promise<void> {
  const data: Record<string, unknown> = {
    updatedAt: firestore.FieldValue.serverTimestamp(),
  };

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
          updatedAt: firestore.FieldValue.serverTimestamp(),
        }
      : null;
  }

  await firestore().collection("profiles").doc(uid).update(data);
}

/** Owner-only toggle for one projected linked account. */
export async function setLinkVisibility(
  platform: ProfileLinkPlatform,
  visible: boolean,
): Promise<void> {
  await callSocialApi<{ ok: true; platform: ProfileLinkPlatform; visible: boolean }>(
    "/social/links/visibility",
    { platform, visible },
  );
}

/**
 * Rebuilds `profiles/{uid}.links` from the private linked-account documents.
 *
 * Link writes made by the backend are projected automatically now; this is the
 * catch-up path for a client-side unlink (`users/*` is owner-writable from the
 * app), and for a projection that failed at link time.
 */
export async function syncLinks(): Promise<void> {
  await callSocialApi<{ ok: true }>("/social/links/sync", {});
}
