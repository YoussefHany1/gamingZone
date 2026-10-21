/**
 * Helpers for reading the query string of a linking deep link
 * (`gaming-zone://steam-link?status=success&steamId=…`).
 */

/** Reads a raw (still percent-encoded) query parameter out of a deep link. */
export function readQueryParam(url: string, name: string): string {
  const query = url.split("?")[1] ?? "";
  return new RegExp(`(?:^|&)${name}=([^&]*)`).exec(query)?.[1] ?? "";
}

/** Decodes a query value, tolerating malformed percent escapes. */
export function decodeQueryValue(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}
