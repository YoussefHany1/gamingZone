/**
 * Social layer primitives shared by mobile, web and the Vercel backend.
 *
 * This module is the single source of truth for handle validation, pair ids and
 * the public-profile shape. Anything that writes `profiles/{uid}`,
 * `usernames/*`, `friendRequests/*` or `friendships/*` must import from here —
 * a client-side and a server-side copy drifting apart is how handles end up
 * reserved in one place and reusable in the other, or two docs disagree about
 * who is friends with whom.
 *
 * Pure logic only: no Firebase imports, so the standalone backend can mirror it
 * in plain JS and both sides stay unit-testable with vitest.
 */

// ---------------------------------------------------------------------------
// Handles
// ---------------------------------------------------------------------------

export const HANDLE_MIN_LENGTH = 3;
export const HANDLE_MAX_LENGTH = 20;
export const HANDLE_PATTERN = /^[a-z0-9_]{3,20}$/;

export const HANDLE_ERROR_CODES = [
  "empty",
  "length",
  "charset",
  "reserved",
] as const;

export type HandleErrorCode = (typeof HANDLE_ERROR_CODES)[number];

export type HandleValidation =
  | { ok: true; handle: string }
  | { ok: false; reason: HandleErrorCode };

/**
 * Words a user may not claim. Three groups, all for different reasons:
 *
 *   platform  — someone could pose as the platform itself
 *   route     — `/u/{handle}` shares a namespace with these public routes, so
 *               a handle equal to one of them would be unreachable on web
 *   staff     — impersonation of Gaming Zone staff or support
 *
 * Keep this list lowercase; `validateHandle` normalises before comparing.
 */
export const RESERVED_HANDLES: ReadonlySet<string> = new Set([
  // Platforms
  "steam",
  "xbox",
  "psn",
  "playstation",
  "nintendo",
  "discord",
  "google",
  "apple",
  "epic",
  "epicgames",
  "microsoft",
  "riot",
  "riotgames",
  "battlenet",
  "blizzard",

  // Web route collisions under /u/{handle}
  "u",
  "user",
  "users",
  "chat",
  "chats",
  "social",
  "session",
  "sessions",
  "profile",
  "profiles",
  "admin",
  "api",
  "settings",
  "games",
  "game",
  "news",
  "lists",
  "list",
  "events",
  "event",
  "login",
  "register",
  "auth",
  "signin",
  "signup",
  "about",
  "contact",
  "privacy",
  "terms",
  "support",

  // Impersonation
  "official",
  "staff",
  "mod",
  "moderator",
  "admin_",
  "gamingzone",
  "gaming_zone",
  "gaming-zone",
  "system",
  "root",
]);

/** Strips a leading `@`, trims, and lowercases. The canonical form. */
export function normalizeHandle(raw: string): string {
  return raw.trim().replace(/^@+/, "").toLowerCase();
}

/**
 * Validates an already-visible-to-the-user handle string.
 *
 * The result carries the normalised handle, so callers never validate one
 * string and store another.
 */
export function validateHandle(raw: string): HandleValidation {
  const handle = normalizeHandle(raw);

  if (handle.length === 0) return { ok: false, reason: "empty" };
  if (handle.length < HANDLE_MIN_LENGTH || handle.length > HANDLE_MAX_LENGTH) {
    return { ok: false, reason: "length" };
  }
  if (!HANDLE_PATTERN.test(handle)) return { ok: false, reason: "charset" };
  if (RESERVED_HANDLES.has(handle)) return { ok: false, reason: "reserved" };

  return { ok: true, handle };
}

/**
 * Folds a display name into a handle-safe base: accents removed, anything that
 * is not `[a-z0-9_]` collapsed to `_`, trimmed and length-capped.
 *
 * Arabic (or any non-Latin) display name yields an empty string on purpose —
 * callers substitute a neutral base and rely on the uid suffix for uniqueness,
 * rather than transliterating badly.
 */
export function slugifyHandleBase(displayName: string, maxLength = 14): string {
  const ascii = displayName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");

  return ascii.slice(0, maxLength).replace(/_+$/g, "");
}

/**
 * Bounded candidate list for auto-generated handles, most natural first.
 *
 * Registration and the migration both need "a handle that is unique without a
 * round-trip" — and both need it to be deterministic, so a retry produces the
 * same answer and the idempotency check in the migration converges.
 */
export function handleCandidates(displayName: string, uid: string): string[] {
  const safeUid = uid.toLowerCase().replace(/[^a-z0-9]/g, "");
  const base = slugifyHandleBase(displayName) || "player";
  const candidates: string[] = [];

  // 4, then 6, then 8 characters of uid, then the whole uid.
  for (const length of [4, 6, 8, safeUid.length]) {
    if (length < 4 || length > safeUid.length) continue;
    candidates.push(`${base}_${safeUid.slice(0, length)}`);
  }

  // Numeric fallbacks keep the list finite even for a pathological uid.
  for (let i = 1; i <= 5; i += 1) {
    candidates.push(`${base}_${safeUid.slice(0, 4)}${i}`);
  }

  return Array.from(new Set(candidates)).filter(
    (candidate) => validateHandle(candidate).ok,
  );
}

// ---------------------------------------------------------------------------
// Public profile
// ---------------------------------------------------------------------------

export const PROFILE_BIO_MAX_LENGTH = 300;
export const PROFILE_STATUS_MAX_LENGTH = 60;
export const PROFILE_DISPLAY_NAME_MAX_LENGTH = 50;

/** Platforms whose identifier the profile may project. */
export const PROFILE_LINK_PLATFORMS = ["steam", "psn", "xbox", "discord"] as const;

export type ProfileLinkPlatform = (typeof PROFILE_LINK_PLATFORMS)[number];

/**
 * One projected linked account.
 *
 * `identifier` is the displayable id (SteamID64, PSN online id, Xbox gamertag,
 * Discord id) snapshotted from `users/{uid}/linkedAccounts/{platform}`.
 * `visible` is the owner's opt-in and is the only field a client can change.
 */
export interface ProfileLink {
  platform: ProfileLinkPlatform;
  identifier: string;
  visible: boolean;
  linkedAt: number | null;
}

export type ProfileLinks = Partial<Record<ProfileLinkPlatform, ProfileLink>>;

export interface ProfileStatus {
  text: string;
  emoji: string;
  updatedAt: number | null;
}

export interface ProfilePrivacy {
  /** Appears in handle search and in the public `/u/{handle}` page. */
  discoverable: boolean;
  /** Show linked accounts on the public profile at all. */
  showLinks: boolean;
  showStats: boolean;
}

export interface ProfileCounts {
  friends: number;
  sessions: number;
}

/**
 * Public projection of a user. `users/{uid}` stays private; this is the only
 * document other users read.
 *
 * Timestamps are millis since epoch (`number | null`) because the three SDKs
 * expose Timestamp objects with incompatible types. Each client maps on read.
 */
export interface PublicProfile {
  uid: string;
  handle: string;
  handleLower: string;
  displayName: string;
  photoURL: string | null;
  bannerURL: string | null;
  bio: string;
  status: ProfileStatus | null;
  platform: string;
  country: string;
  links: ProfileLinks;
  privacy: ProfilePrivacy;
  counts: ProfileCounts;
  createdAt: number | null;
  migrationVersion?: number;
}

/** Fields a client may write directly to its own `profiles` document. */
export const CLIENT_WRITABLE_PROFILE_FIELDS = [
  "displayName",
  "photoURL",
  "bannerURL",
  "bio",
  "status",
  "platform",
  "country",
  "privacy",
  "updatedAt",
] as const;

export function createDefaultPrivacy(): ProfilePrivacy {
  return { discoverable: true, showLinks: true, showStats: false };
}

export function createEmptyProfileCounts(): ProfileCounts {
  return { friends: 0, sessions: 0 };
}

/** Same-origin profile path used by both clients and share links. */
export function profilePath(handle: string): string {
  return `/u/${normalizeHandle(handle)}`;
}

/**
 * URL for a projected link, or `null` when the platform has no public profile
 * URL worth linking. PSN and Xbox identifiers are copyable, not linkable.
 */
export function profileLinkUrl(link: ProfileLink): string | null {
  switch (link.platform) {
    case "steam":
      return link.identifier ? `https://steamcommunity.com/profiles/${link.identifier}` : null;
    case "discord":
      return link.identifier ? `https://discord.com/users/${link.identifier}` : null;
    case "psn":
    case "xbox":
    default:
      return null;
  }
}

/** Trims and caps free text, returning `""` for non-strings. */
export function clampProfileText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

// ---------------------------------------------------------------------------
// Friends & blocking
// ---------------------------------------------------------------------------

/**
 * Pair ids are **sorted** before joining, so A→B and B→A resolve to the same
 * document. Firebase uids are alphanumeric, so `_` is an unambiguous separator.
 */
export function sortPair(uidA: string, uidB: string): [string, string] {
  return uidA < uidB ? [uidA, uidB] : [uidB, uidA];
}

/** Symmetric friendship document id: `{uidA}_{uidB}`, sorted. */
export function friendshipId(uidA: string, uidB: string): string {
  const [first, second] = sortPair(uidA, uidB);
  return `${first}_${second}`;
}

/** Symmetric block document id (same shape as a friendship id, different collection). */
export function blockedPairId(uidA: string, uidB: string): string {
  return friendshipId(uidA, uidB);
}

/**
 * Directional friend-request id: `{from}_{to}`.
 *
 * Deliberately *not* sorted: a request from A to B and B's request to A are two
 * different documents, and their coexistence is what triggers auto-accept.
 */
export function friendRequestId(from: string, to: string): string {
  return `${from}_${to}`;
}

export const FRIEND_REQUEST_STATUSES = [
  "pending",
  "accepted",
  "declined",
  "cancelled",
] as const;

export type FriendRequestStatus = (typeof FRIEND_REQUEST_STATUSES)[number];

export const FRIENDSHIP_STATUSES = ["active", "ended"] as const;

export type FriendshipStatus = (typeof FRIENDSHIP_STATUSES)[number];

/**
 * Friendships are never hard-deleted (account deletion is the only delete
 * path), so unfriending flips `status` and keeps `members` for auditing.
 */
export interface Friendship {
  id: string;
  members: [string, string];
  status: FriendshipStatus;
  createdAt: number | null;
  endedAt: number | null;
}

export interface FriendRequest {
  id: string;
  from: string;
  to: string;
  status: FriendRequestStatus;
  createdAt: number | null;
  respondedAt: number | null;
}

/** How the signed-in user relates to another profile, derived client-side. */
export type FriendRelation =
  | "self"
  | "friends"
  | "request_sent"
  | "request_received"
  | "blocked"
  | "none";

/** One row in handle search. The full profile is read only when opened. */
export interface ProfileSearchHit {
  uid: string;
  handle: string;
  displayName: string;
  photoURL: string | null;
  platform: string;
  country: string;
}

export const PROFILE_SEARCH_MIN_LENGTH = 2;
export const PROFILE_SEARCH_LIMIT = 20;
const PROFILE_SEARCH_MAX_LENGTH = 30;

/**
 * Canonical search input: trimmed, lowercased, leading `@` removed and capped.
 * Search is handle-prefix only, so normalising the query is enough — no
 * accent folding, since handles are ASCII by construction.
 */
export function normalizeProfileSearch(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw
    .trim()
    .replace(/^@+/, "")
    .toLowerCase()
    .slice(0, PROFILE_SEARCH_MAX_LENGTH);
}
