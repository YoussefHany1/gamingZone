import type { Game } from "@/src/types/sharedTypes";

/**
 * Row cap of a single `/release-calendar` response.
 *
 * IGDB (and the endpoint in front of it) caps one query at 500 games. A busy
 * week of releases already exceeds that, and because the endpoint sorts the
 * window **ascending**, the truncation silently drops the *newest* days — the
 * exact days the release calendar exists to show.
 */
export const RELEASE_CALENDAR_PAGE_LIMIT = 500;

const DAY_SECONDS = 86_400;

/**
 * First-pass window size. Ten days stays under the cap on normal traffic while
 * keeping the request count low; any chunk that still comes back full is
 * halved recursively.
 */
const INITIAL_CHUNK_DAYS = 10;

/** Fetches one inclusive [from, to] page (Unix seconds). */
export type ReleaseCalendarPageFetcher = (
  from: number,
  to: number,
) => Promise<Game[]>;

type Window = { from: number; to: number };

/** Splits a window into consecutive, inclusive, day-sized chunks. */
function chunkWindow(from: number, to: number, chunkDays: number): Window[] {
  const windows: Window[] = [];
  const span = chunkDays * DAY_SECONDS;
  for (let start = from; start <= to; start += span) {
    windows.push({ from: start, to: Math.min(to, start + span - 1) });
  }
  return windows;
}

/**
 * Fetches one window, halving it while the server reports a full page (a full
 * page means "there may be more rows that were cut off").
 */
async function fetchWindow(
  window: Window,
  fetchPage: ReleaseCalendarPageFetcher,
): Promise<Game[]> {
  const games = await fetchPage(window.from, window.to);
  if (games.length < RELEASE_CALENDAR_PAGE_LIMIT) return games;

  const days = Math.floor((window.to - window.from + 1) / DAY_SECONDS);
  // A single day cannot be split any further: keep the capped page instead of
  // recursing forever.
  if (days <= 1) return games;

  // `window.from` is day-aligned (the caller builds it from UTC midnights), so
  // the midpoint is too, and the two halves never overlap or leave a gap.
  const mid = window.from + Math.floor(days / 2) * DAY_SECONDS;
  const [older, newer] = await Promise.all([
    fetchWindow({ from: window.from, to: mid - 1 }, fetchPage),
    fetchWindow({ from: mid, to: window.to }, fetchPage),
  ]);
  return [...older, ...newer];
}

/**
 * Fetches **every** game in an inclusive [from, to] window despite the
 * endpoint's 500-row cap.
 *
 * The window is fetched in date-ascending chunks and any chunk that hits the
 * cap is split in half until it fits, then the pages are merged (id-deduped)
 * back into one ascending list. Without this the tail of a dense window — i.e.
 * today and the upcoming days — is silently missing.
 */
export async function fetchReleaseCalendarWindow(
  from: number,
  to: number,
  fetchPage: ReleaseCalendarPageFetcher,
): Promise<Game[]> {
  const chunks = chunkWindow(from, to, INITIAL_CHUNK_DAYS);
  const pages = await Promise.all(
    chunks.map((chunk) => fetchWindow(chunk, fetchPage)),
  );

  const seen = new Set<number>();
  const games: Game[] = [];
  for (const page of pages) {
    for (const game of page) {
      if (seen.has(game.id)) continue;
      seen.add(game.id);
      games.push(game);
    }
  }
  return games;
}
