/**
 * Normalized keys for Firestore prefix search on `users`.
 *
 * Firestore cannot lowercase or trim inside a query, so the admin dashboard
 * searches `displayNameLower` / `emailLower` with a range (`>= prefix`, `<=
 * prefix + \uf8ff`). Both fields are written here on register/profile save and
 * backfilled for existing accounts by `scripts/backfillUserSearchKeys.ts`.
 */

/** Lowercases, trims and caps a display name for prefix matching. */
export function toDisplayNameKey(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().slice(0, 80);
}

/** Lowercases and trims an email for exact/prefix matching. */
export function toEmailKey(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().slice(0, 80);
}
