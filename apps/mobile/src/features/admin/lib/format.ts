/** Date/format helpers shared by the admin screens. */

export function formatAdminDate(
  value: number | null | undefined,
  language: string,
): string {
  if (!value || !Number.isFinite(value)) return "—";
  try {
    return new Intl.DateTimeFormat(language, { dateStyle: "medium" }).format(
      new Date(value),
    );
  } catch {
    return new Date(value).toLocaleDateString();
  }
}

export function formatAdminDateTime(
  value: number | null | undefined,
  language: string,
): string {
  if (!value || !Number.isFinite(value)) return "—";
  try {
    return new Intl.DateTimeFormat(language, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return new Date(value).toLocaleString();
  }
}

/** Formats the backend's ISO auth metadata (`lastSignInTime`). */
export function formatAdminAuthDate(
  value: string | null | undefined,
  language: string,
): string {
  if (!value) return "—";
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? formatAdminDateTime(parsed, language) : "—";
}
