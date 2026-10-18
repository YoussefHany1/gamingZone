/**
 * Converts an ISO 3166-1 alpha-2 country code into its regional-indicator
 * emoji (e.g. `"US"` → 🇺🇸). Returns an empty string for anything that is not
 * a two-letter code.
 */
export function flagEmoji(countryCode: string): string {
  if (!/^[A-Za-z]{2}$/.test(countryCode)) return "";

  const codepoint = (letter: string): number =>
    127397 + letter.toUpperCase().charCodeAt(0);

  return String.fromCodePoint(
    codepoint(countryCode[0] ?? ""),
    codepoint(countryCode[1] ?? ""),
  );
}
