/**
 * Shared Unix-second time helpers for the IGDB query layer. Relative windows
 * (e.g. "last 6 months") are computed once here so every endpoint stays in
 * sync instead of inlining its own `new Date()` / `setMonth` math.
 */

export function unixNow() {
  return Math.floor(Date.now() / 1000);
}

export function unixDaysAgo(days) {
  return unixNow() - days * 86400;
}

export function unixDaysFromNow(days) {
  return unixNow() + days * 86400;
}

export function unixMonthsAgo(months) {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return Math.floor(d.getTime() / 1000);
}

export function unixYearsAgo(years) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return Math.floor(d.getTime() / 1000);
}