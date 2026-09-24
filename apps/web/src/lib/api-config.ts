/**
 * Base URL of the Gaming Zone backend API (IGDB proxy).
 * Default points at the public deployment so local dev works out of the box.
 */
const DEFAULT_SERVER_URL = "https://api-fallback.vercel.app";

export function getServerApiUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SERVER_URL || DEFAULT_SERVER_URL;
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}
