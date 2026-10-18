import { describe, expect, it } from "vitest";
import {
  DAY_SECONDS,
  currentUtcMonth,
  monthGridUtc,
  monthKey,
  parseDayKey,
  shiftMonth,
  todayUtcMidnight,
  utcDayKey,
} from "./calendarDates";

/**
 * These tests pin down the UTC anchoring that the release calendar depends on.
 * The module's header documents the failure mode being guarded against: IGDB
 * stores `first_release_date` at 00:00:00 UTC, so any local-time formatting
 * shifts the day for users west of UTC (the whole Americas and Pacific).
 *
 * The assertions below are timezone-independent by construction because every
 * helper reads UTC components only — which is exactly what they verify.
 */

describe("DAY_SECONDS", () => {
  it("is one day in seconds", () => {
    expect(DAY_SECONDS).toBe(86_400);
  });
});

describe("utcDayKey", () => {
  it("formats the UTC day of a Unix-seconds timestamp", () => {
    expect(utcDayKey(Date.UTC(2026, 2, 4) / 1000)).toBe("2026-03-04");
  });

  it("stays on the same UTC day across its whole span", () => {
    expect(utcDayKey(Date.UTC(2026, 2, 4, 0, 0, 1) / 1000)).toBe("2026-03-04");
    expect(utcDayKey(Date.UTC(2026, 2, 4, 23, 59, 59) / 1000)).toBe("2026-03-04");
  });

  it("zero-pads month and day", () => {
    expect(utcDayKey(Date.UTC(2026, 0, 9) / 1000)).toBe("2026-01-09");
  });
});

describe("todayUtcMidnight", () => {
  it("returns 00:00:00 UTC of the current UTC day", () => {
    expect(todayUtcMidnight(Date.UTC(2026, 2, 4, 12, 0, 0))).toBe(
      Date.UTC(2026, 2, 4) / 1000,
    );
  });

  it("does not roll over late in the UTC day", () => {
    // A local-time implementation would produce the wrong day for users in
    // negative UTC offsets; the UTC one must not roll forward.
    expect(todayUtcMidnight(Date.UTC(2026, 2, 4, 23, 59, 59))).toBe(
      Date.UTC(2026, 2, 4) / 1000,
    );
  });
});

describe("currentUtcMonth", () => {
  it("returns the UTC year and 0-based month", () => {
    expect(currentUtcMonth(Date.UTC(2026, 2, 4, 23, 0, 0))).toEqual({
      year: 2026,
      month: 2,
    });
  });

  it("does not roll the month over near a UTC month boundary", () => {
    expect(currentUtcMonth(Date.UTC(2026, 2, 31, 23, 59, 59))).toEqual({
      year: 2026,
      month: 2,
    });
  });
});

describe("monthGridUtc", () => {
  it("always returns a 6x7 grid (42 cells)", () => {
    expect(monthGridUtc(2026, 2)).toHaveLength(42);
    // A month that fits in four weeks is still padded, so the section below the
    // calendar never jumps when paging between months.
    expect(monthGridUtc(2027, 1)).toHaveLength(42);
  });

  it("starts on the Monday of the week containing the 1st", () => {
    // 2026-03-01 is a Sunday, so a Monday-first grid starts on 2026-02-23.
    const march = monthGridUtc(2026, 2);
    expect(march[0]).toBe("2026-02-23");
    expect(march[6]).toBe("2026-03-01");
  });

  it("starts exactly on the 1st when the month begins on a Monday", () => {
    // 2027-02-01 is a Monday.
    expect(monthGridUtc(2027, 1)[0]).toBe("2027-02-01");
  });

  it("covers every day of the month in order", () => {
    const march = monthGridUtc(2026, 2);
    const marchDays = march.filter((key) => key.startsWith("2026-03"));
    expect(marchDays[0]).toBe("2026-03-01");
    expect(marchDays[marchDays.length - 1]).toBe("2026-03-31");
    expect(marchDays).toHaveLength(31);
  });

  it("pads with neighbouring months' days rather than blanks", () => {
    const march = monthGridUtc(2026, 2);
    expect(march.some((key) => key.startsWith("2026-02"))).toBe(true);
    expect(march.some((key) => key.startsWith("2026-04"))).toBe(true);
  });

  it("handles a leap February", () => {
    const february = monthGridUtc(2028, 1).filter((key) => key.startsWith("2028-02"));
    expect(february).toHaveLength(29);
  });
});

describe("shiftMonth", () => {
  it("moves forward across a year boundary", () => {
    expect(shiftMonth(2026, 11, 1)).toEqual({ year: 2027, month: 0 });
  });

  it("moves backward across a year boundary", () => {
    expect(shiftMonth(2026, 0, -1)).toEqual({ year: 2025, month: 11 });
  });

  it("moves by multiple months", () => {
    expect(shiftMonth(2026, 0, 14)).toEqual({ year: 2027, month: 2 });
    expect(shiftMonth(2026, 0, -14)).toEqual({ year: 2024, month: 10 });
  });

  it("is a no-op for delta 0", () => {
    expect(shiftMonth(2026, 5, 0)).toEqual({ year: 2026, month: 5 });
  });
});

describe("monthKey", () => {
  it("formats a 0-based month as yyyy-MM", () => {
    expect(monthKey(2026, 0)).toBe("2026-01");
    expect(monthKey(2026, 2)).toBe("2026-03");
    expect(monthKey(2026, 11)).toBe("2026-12");
  });
});

describe("parseDayKey", () => {
  it("splits a day key into numeric parts with a 1-based month", () => {
    expect(parseDayKey("2026-03-04")).toEqual({ year: 2026, month: 3, day: 4 });
  });

  it("round-trips with utcDayKey", () => {
    const timestamps = [
      Date.UTC(2026, 0, 1) / 1000,
      Date.UTC(2026, 2, 4, 23, 59, 59) / 1000,
      Date.UTC(2028, 1, 29) / 1000,
    ];

    for (const ts of timestamps) {
      const parsed = parseDayKey(utcDayKey(ts));
      const expected = new Date(ts * 1000);
      expect(parsed).toEqual({
        year: expected.getUTCFullYear(),
        month: expected.getUTCMonth() + 1,
        day: expected.getUTCDate(),
      });
    }
  });
});
