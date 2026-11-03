import { Linking } from "react-native";
import { logger } from "@/src/lib/logger";

/**
 * Link validation for play-session "party room" links (Discord, lobby URLs…).
 *
 * The identical rules are mirrored in `apps/backend/api/sessions.js` — the
 * Vercel folder deploys standalone and cannot import this workspace file —
 * so a link cannot slip past either side. Enforcing `https:` only keeps
 * dangerous schemes (`javascript:`, `intent:`, custom app schemes) out by
 * construction, on top of the backend check.
 */
export const SESSION_LINK_MAX_LENGTH = 2048;

export type SessionLinkKind = "voice" | "lobby" | "party";

export type SessionLink = {
  id: string;
  label: string | null;
  url: string;
  kind: SessionLinkKind;
};

export const SESSION_LINK_KINDS: readonly SessionLinkKind[] = [
  "voice",
  "lobby",
  "party",
];

/**
 * Returns the trimmed https URL, or null when the input is not safe.
 * Rules: https scheme, no embedded whitespace, a dotted host (also rejects
 * `user@host` userinfo tricks), and at most 2048 characters.
 */
export function validateSessionUrl(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const url = input.trim();
  if (!url || url.length > SESSION_LINK_MAX_LENGTH || /\s/.test(url)) {
    return null;
  }
  if (!/^https:\/\//i.test(url)) return null;
  const host = url.slice("https://".length).split(/[/?#]/)[0] ?? "";
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+(?::\d{1,5})?$/i.test(host)) return null;
  return url;
}

/**
 * Opens a session link after re-validating it right before `openURL`.
 * Returns false when the link is invalid or the device refuses the
 * navigation, so the caller can surface an error toast.
 */
export async function openSessionLink(url: string): Promise<boolean> {
  const validated = validateSessionUrl(url);
  if (!validated) return false;
  try {
    await Linking.openURL(validated);
    return true;
  } catch (error) {
    logger.warn("[social] Session link failed to open", error);
    return false;
  }
}
