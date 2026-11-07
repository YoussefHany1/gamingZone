/** A user counts as online for this long after their last heartbeat. */
export const ONLINE_WINDOW_MS = 5 * 60_000;

/**
 * Client-side presence rule shared by the friends list (`useSocialPresence`)
 * and the chat header (`usePeerPresence`): a heartbeat inside the window
 * means the user is online right now.
 */
export function isPresenceFresh(
  updatedAt: unknown,
  now: number = Date.now(),
): boolean {
  return typeof updatedAt === "number" && now - updatedAt < ONLINE_WINDOW_MS;
}
