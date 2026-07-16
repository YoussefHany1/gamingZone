export function parseGameTimestamp(
  timestamp?: string | number | null,
): number | null {
  if (!timestamp) return null;

  if (typeof timestamp === "string") {
    return Math.floor(new Date(timestamp).getTime() / 1000);
  }

  // If timestamp is in milliseconds (e.g. > 1e11), convert to seconds
  return timestamp > 1e11 ? Math.floor(timestamp / 1000) : timestamp;
}
