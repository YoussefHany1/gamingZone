/** Renders the "last synced" stamp of a linked account. */
export function formatSyncDate(ts?: number | null): string {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}
