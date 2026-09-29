/**
 * UTC-anchored calendar helpers for the release calendar.
 *
 * ── Why none of this uses date-fns ───────────────────────────────────────────
 * IGDB does not store a publisher-entered release date as an instant. It
 * normalises it to 00:00:00 UTC, so `first_release_date` encodes a *calendar
 * day*, not a moment in time.
 *
 * Formatting it with a local-time formatter puts it on the wrong day for every
 * user west of UTC. A game dated 2026-03-04 is stored as 2026-03-04T00:00:00Z:
 *
 *   Asia/Riyadh        (UTC+3) → Mar  4, 03:00 local → "2026-03-04"  correct
 *   America/Los_Angeles(UTC-8) → Mar  3, 16:00 local → "2026-03-03"  wrong
 *
 * That is the entire Americas and the Pacific, so it is not an edge case.
 * Mixing a local-time month grid with a UTC-keyed data map is worse still: the
 * cells would show one date while containing another day's games.
 *
 * Everything below therefore reads UTC components off the native `Date` API.
 * date-fns is still used by the component for *localised label rendering* only,
 * where the input is an index (0-11, 0-6) rather than a date, so the user's
 * timezone cannot affect the result.
 */

export const DAY_SECONDS = 86_400;

/** 6 weeks x 7 days — a constant grid height, see `monthGridUtc`. */
const GRID_CELLS = 42;

const pad2 = (n: number): string => String(n).padStart(2, "0");

/**
 * "yyyy-MM-dd" for the UTC day that a Unix-**seconds** timestamp falls in.
 *
 * Deliberately does not use date-fns `format`, which would apply the device
 * timezone. See the module comment for the worked example.
 */
export function utcDayKey(tsSeconds: number): string {
  const d = new Date(tsSeconds * 1000);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/** Unix seconds for 00:00:00 UTC of the current day. */
export function todayUtcMidnight(nowMs: number = Date.now()): number {
  const d = new Date(nowMs);
  return Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 1000);
}

/** Current UTC year and 0-based month. */
export function currentUtcMonth(nowMs: number = Date.now()): { year: number; month: number } {
  const d = new Date(nowMs);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
}

/**
 * The 6x7 grid of UTC day keys covering `month` (0-based), Monday-first.
 *
 * Always exactly 42 cells. A month that fits in 4 or 5 weeks (Feb 2027, for
 * one) is still padded to 6 rows so the grid's height never changes as the
 * user pages between months — otherwise the section below it jumps on every
 * arrow tap, which is jarring on the home screen. Trailing padding cells spill
 * into the next month and render dimmed, exactly as a paper calendar does.
 */
export function monthGridUtc(year: number, month: number): string[] {
  const firstWeekdayMon0 = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
  const monthStartTs = Date.UTC(year, month, 1) / 1000;
  return Array.from({ length: GRID_CELLS }, (_, i) =>
    utcDayKey(monthStartTs + (i - firstWeekdayMon0) * DAY_SECONDS),
  );
}

/** Month arithmetic that stays UTC-safe, clamping the month into [0, 11]. */
export function shiftMonth(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const d = new Date(Date.UTC(year, month + delta, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
}

/** "yyyy-MM" for a 0-based month, used for localised month headings. */
export function monthKey(year: number, month: number): string {
  return `${year}-${pad2(month + 1)}`;
}

/** Splits a key produced by `utcDayKey` back into its numeric parts. */
export function parseDayKey(key: string): {
  year: number;
  /** 1-based, to match the string form. */
  month: number;
  day: number;
} {
  const parts = key.split("-").map(Number);
  return { year: parts[0] ?? 0, month: parts[1] ?? 0, day: parts[2] ?? 0 };
}
