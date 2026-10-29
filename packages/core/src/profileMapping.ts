/**
 * Firestore → `PublicProfile` mapping.
 *
 * Shared by both clients so a profile renders identically on mobile and web:
 * timestamps become millis, missing personalisation falls back to the same
 * defaults `claimHandle` writes, and unknown/invalid links are dropped instead
 * of rendering an empty badge.
 *
 * Pure logic only — the timestamp reader is duck-typed (`toMillis`) rather than
 * importing any Firebase SDK, so this stays usable from React Native, the web
 * client and Cloud Functions alike.
 */
import {
  createDefaultPrivacy,
  createEmptyProfileCounts,
  PROFILE_LINK_PLATFORMS,
  type ProfileLink,
  type ProfileLinkPlatform,
  type ProfileLinks,
  type ProfilePrivacy,
  type ProfileStatus,
  type PublicProfile,
} from "./social";

type TimestampLike = { toMillis: () => number };

function isTimestampLike(value: unknown): value is TimestampLike {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { toMillis?: unknown }).toMillis === "function"
  );
}

/** Firestore Timestamp | millis | anything else → millis or null. */
export function timestampToMillis(value: unknown): number | null {
  if (isTimestampLike(value)) return value.toMillis();
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function mapLink(platform: ProfileLinkPlatform, value: unknown): ProfileLink | null {
  if (typeof value !== "object" || value === null) return null;

  const raw = value as Record<string, unknown>;
  const identifier = asString(raw.identifier).trim();
  if (!identifier) return null;

  return {
    platform,
    identifier,
    visible: raw.visible === true,
    linkedAt: timestampToMillis(raw.linkedAt),
  };
}

export function mapLinks(value: unknown): ProfileLinks {
  const links: ProfileLinks = {};
  if (typeof value !== "object" || value === null) return links;

  const raw = value as Record<string, unknown>;
  for (const platform of PROFILE_LINK_PLATFORMS) {
    const link = mapLink(platform, raw[platform]);
    if (link) links[platform] = link;
  }
  return links;
}

export function mapStatus(value: unknown): ProfileStatus | null {
  if (typeof value !== "object" || value === null) return null;

  const raw = value as Record<string, unknown>;
  const text = asString(raw.text).trim();
  if (!text) return null;

  return {
    text,
    emoji: asString(raw.emoji),
    updatedAt: timestampToMillis(raw.updatedAt),
  };
}

export function mapPrivacy(value: unknown): ProfilePrivacy {
  const defaults = createDefaultPrivacy();
  if (typeof value !== "object" || value === null) return defaults;

  const raw = value as Record<string, unknown>;
  return {
    discoverable:
      typeof raw.discoverable === "boolean" ? raw.discoverable : defaults.discoverable,
    showLinks: typeof raw.showLinks === "boolean" ? raw.showLinks : defaults.showLinks,
    showStats: typeof raw.showStats === "boolean" ? raw.showStats : defaults.showStats,
  };
}

/**
 * Returns `null` while the document is missing its handle — i.e. before
 * `claimHandle` (or the migration) has bootstrapped the profile. Callers should
 * treat that as "not ready yet", not as a broken profile.
 */
export function mapPublicProfile(
  uid: string,
  data: Record<string, unknown> | undefined,
): PublicProfile | null {
  if (!data) return null;

  const handle = asString(data.handle) || asString(data.handleLower);
  if (!handle) return null;

  return {
    uid,
    handle,
    handleLower: asString(data.handleLower, handle.toLowerCase()),
    displayName: asString(data.displayName, "Player"),
    photoURL: typeof data.photoURL === "string" ? data.photoURL : null,
    bannerURL: typeof data.bannerURL === "string" ? data.bannerURL : null,
    bio: asString(data.bio),
    status: mapStatus(data.status),
    platform: asString(data.platform),
    country: asString(data.country),
    links: mapLinks(data.links),
    privacy: mapPrivacy(data.privacy),
    counts:
      typeof data.counts === "object" && data.counts !== null
        ? {
            friends:
              typeof (data.counts as Record<string, unknown>).friends === "number"
                ? ((data.counts as Record<string, unknown>).friends as number)
                : 0,
            sessions:
              typeof (data.counts as Record<string, unknown>).sessions === "number"
                ? ((data.counts as Record<string, unknown>).sessions as number)
                : 0,
          }
        : createEmptyProfileCounts(),
    createdAt: timestampToMillis(data.createdAt),
    ...(typeof data.migrationVersion === "number"
      ? { migrationVersion: data.migrationVersion }
      : {}),
  };
}
