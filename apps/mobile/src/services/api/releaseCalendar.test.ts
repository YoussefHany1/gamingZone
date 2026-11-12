import { describe, expect, it } from "vitest";
import type { Game } from "@/src/types/sharedTypes";
import {
  RELEASE_CALENDAR_PAGE_LIMIT,
  fetchReleaseCalendarWindow,
  type ReleaseCalendarPageFetcher,
} from "./releaseCalendar";

const DAY_SECONDS = 86_400;

/** 2026-11-04T00:00:00Z — an arbitrary, timezone-independent window start. */
const BASE = Date.UTC(2026, 10, 4) / 1000;

/** 7 days back + 31 days forward, the release calendar's real window. */
const WINDOW_DAYS = 38;
const TO = BASE + WINDOW_DAYS * DAY_SECONDS - 1;

/**
 * Simulates the real endpoint: serves `perDay[i]` games from day `i`, ordered
 * ascending, and truncates every response at the 500-row cap.
 */
function simulatedApi(perDay: readonly number[]): {
  calls: Array<{ from: number; to: number }>;
  fetchPage: ReleaseCalendarPageFetcher;
} {
  const calls: Array<{ from: number; to: number }> = [];

  const fetchPage: ReleaseCalendarPageFetcher = async (from, to) => {
    calls.push({ from, to });
    const games: Game[] = [];

    for (let day = 0; day < perDay.length; day++) {
      const dayStart = BASE + day * DAY_SECONDS;
      if (dayStart < from || dayStart > to) continue;

      const count = perDay[day] ?? 0;
      for (let i = 0; i < count; i++) {
        games.push({ id: dayStart + i } as Game);
      }
    }

    return games.slice(0, RELEASE_CALENDAR_PAGE_LIMIT);
  };

  return { calls, fetchPage };
}

/** Counts games per UTC day, the way the calendar buckets them. */
function countPerDay(games: readonly Game[]): Record<number, number> {
  const counts: Record<number, number> = {};
  for (const game of games) {
    const day = Math.floor((game.id - BASE) / DAY_SECONDS);
    counts[day] = (counts[day] ?? 0) + 1;
  }
  return counts;
}

describe("fetchReleaseCalendarWindow", () => {
  it("keeps today and the upcoming days when the total exceeds the page cap", async () => {
    // A dense week (100/day) followed by a normal month (40/day): 1940 games,
    // almost four full pages — the case the single request silently truncated.
    const perDay = Array.from({ length: WINDOW_DAYS }, (_, day) =>
      day < 7 ? 100 : 40,
    );
    const { calls, fetchPage } = simulatedApi(perDay);

    const games = await fetchReleaseCalendarWindow(BASE, TO, fetchPage);

    expect(games).toHaveLength(1940);
    expect(new Set(games.map((game) => game.id)).size).toBe(1940);

    const counts = countPerDay(games);
    expect(counts[WINDOW_DAYS - 1]).toBe(40);
    expect(counts[0]).toBe(100);

    // The dense leading chunk had to be split; a sparse window would only use
    // the four initial chunks.
    expect(calls.length).toBeGreaterThan(4);
  });

  it("does not split chunks that fit in one page", async () => {
    const perDay = Array.from({ length: WINDOW_DAYS }, () => 10);
    const { calls, fetchPage } = simulatedApi(perDay);

    const games = await fetchReleaseCalendarWindow(BASE, TO, fetchPage);

    expect(games).toHaveLength(380);
    expect(calls).toHaveLength(4);
  });

  it("accepts a capped single day without splitting forever", async () => {
    let callCount = 0;
    const fetchPage: ReleaseCalendarPageFetcher = async () => {
      callCount += 1;
      return Array.from(
        { length: RELEASE_CALENDAR_PAGE_LIMIT },
        (_, i) => ({ id: i } as Game),
      );
    };

    const games = await fetchReleaseCalendarWindow(
      BASE,
      BASE + DAY_SECONDS - 1,
      fetchPage,
    );

    expect(games).toHaveLength(RELEASE_CALENDAR_PAGE_LIMIT);
    expect(callCount).toBe(1);
  });
});
