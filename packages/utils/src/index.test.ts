import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LanguageSupport, Website } from "@gaming-zone/core";
import {
  AGE_RATING_MAP,
  computeTimeLeft,
  extractSteamAppId,
  formatLanguageRows,
  formatPlayTime,
  getAgeRatingLabel,
  getArticleSummary,
  getEventStatus,
  getSummaryKey,
  igdbImageUrl,
  normalizeGameTitle,
} from "./index";

// Fixed clock so the time-dependent helpers are deterministic.
const NOW_MS = Date.UTC(2026, 0, 1); // 2026-01-01T00:00:00Z

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW_MS);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("getAgeRatingLabel", () => {
  it("maps PEGI categories (1-5)", () => {
    expect(getAgeRatingLabel(1)).toBe("3+");
    expect(getAgeRatingLabel(5)).toBe("18+");
  });

  it("maps ESRB categories (6-12)", () => {
    expect(getAgeRatingLabel(6)).toBe("RP");
    expect(getAgeRatingLabel(10)).toBe("T");
    expect(getAgeRatingLabel(12)).toBe("AO");
  });

  it("falls back to RP for unknown categories", () => {
    expect(getAgeRatingLabel(99)).toBe("RP");
    expect(getAgeRatingLabel(-1)).toBe("RP");
  });

  it("exposes the map it is built from", () => {
    expect(AGE_RATING_MAP[3]).toBe("12+");
  });
});

describe("extractSteamAppId", () => {
  const website = (type: number, url: string): Website => ({ id: 1, type, url });

  it("extracts the app id from a store URL", () => {
    expect(
      extractSteamAppId([website(13, "https://store.steampowered.com/app/1245620/Elden_Ring/")]),
    ).toBe("1245620");
  });

  it("returns null when there is no website list", () => {
    expect(extractSteamAppId(undefined)).toBeNull();
    expect(extractSteamAppId([])).toBeNull();
  });

  it("returns null when no website is the Steam store type (13)", () => {
    expect(extractSteamAppId([website(1, "https://example.com")])).toBeNull();
  });

  it("returns null when a type-13 URL does not contain /app/<id>", () => {
    expect(extractSteamAppId([website(13, "https://store.steampowered.com/")])).toBeNull();
  });
});

describe("formatPlayTime", () => {
  it("converts seconds to whole hours for each profile", () => {
    expect(formatPlayTime({ hastily: 7200, normally: 10800, completely: 36000 })).toEqual({
      main: 2,
      mainExtra: 3,
      completionist: 10,
    });
  });

  it("floors partial hours", () => {
    expect(formatPlayTime({ normally: 7199 })).toEqual({
      main: null,
      mainExtra: 1,
      completionist: null,
    });
  });

  it("returns nulls for missing profiles and for no data at all", () => {
    expect(formatPlayTime({})).toEqual({ main: null, mainExtra: null, completionist: null });
    expect(formatPlayTime(undefined)).toBeNull();
  });
});

describe("formatLanguageRows", () => {
  const support = (lang: string, type: string): LanguageSupport => ({
    language: { name: lang },
    language_support_type: { name: type },
  });

  it("folds support types into one row per language, sorted by name", () => {
    expect(
      formatLanguageRows([
        support("English", "Audio"),
        support("English", "Subtitles"),
        support("Arabic", "Interface"),
      ]),
    ).toEqual([
      { name: "Arabic", Audio: false, Subtitles: false, Interface: true },
      { name: "English", Audio: true, Subtitles: true, Interface: false },
    ]);
  });

  it("ignores unknown support types", () => {
    expect(formatLanguageRows([support("English", "SomethingElse")])).toEqual([
      { name: "English", Audio: false, Subtitles: false, Interface: false },
    ]);
  });

  it("returns an empty array for missing input", () => {
    expect(formatLanguageRows(undefined)).toEqual([]);
    expect(formatLanguageRows([])).toEqual([]);
  });
});

describe("getEventStatus", () => {
  const now = Math.floor(NOW_MS / 1000);

  it("is upcoming before the start time", () => {
    expect(getEventStatus(now + 100, now + 200)).toBe("upcoming");
  });

  it("is live between the start and end times (inclusive)", () => {
    expect(getEventStatus(now - 100, now + 100)).toBe("live");
    expect(getEventStatus(now, now)).toBe("live");
  });

  it("is ended after the end time", () => {
    expect(getEventStatus(now - 200, now - 100)).toBe("ended");
  });
});

describe("getSummaryKey", () => {
  it("resolves each supported locale directly", () => {
    expect(getSummaryKey("en")).toBe("summary_en");
    expect(getSummaryKey("ar")).toBe("summary_ar");
    expect(getSummaryKey("pt-BR")).toBe("summary_pt_br");
    expect(getSummaryKey("pt-PT")).toBe("summary_pt_pt");
  });

  it("falls back through the bare language code", () => {
    expect(getSummaryKey("es-MX")).toBe("summary_es");
    expect(getSummaryKey("fr-CA")).toBe("summary_fr");
  });

  it("falls back to English for unknown or empty locales", () => {
    expect(getSummaryKey("de")).toBe("summary_en");
    expect(getSummaryKey("")).toBe("summary_en");
  });
});

describe("getArticleSummary", () => {
  it("prefers the localized summary", () => {
    expect(
      getArticleSummary({ summary_en: "english", summary_ar: "عربي" }, "ar"),
    ).toBe("عربي");
  });

  it("falls back to English when the localized one is missing or blank", () => {
    expect(getArticleSummary({ summary_en: "english" }, "fr")).toBe("english");
    expect(getArticleSummary({ summary_en: "english", summary_fr: "   " }, "fr")).toBe(
      "english",
    );
  });

  it("returns an empty string when there is nothing to show", () => {
    expect(getArticleSummary({}, "ar")).toBe("");
    expect(getArticleSummary({ summary_en: "  " }, "en")).toBe("");
  });
});

describe("computeTimeLeft", () => {
  it("breaks the distance down into days/hours/minutes/seconds", () => {
    const twoDaysThreeHoursFourMinutesFiveSeconds = 2 * 86400 + 3 * 3600 + 4 * 60 + 5;
    expect(computeTimeLeft(Math.floor(NOW_MS / 1000) + twoDaysThreeHoursFourMinutesFiveSeconds))
      .toEqual({ days: 2, hours: 3, minutes: 4, seconds: 5 });
  });

  it("accepts a date string", () => {
    expect(computeTimeLeft("2026-01-02T00:00:00Z")).toEqual({
      days: 1,
      hours: 0,
      minutes: 0,
      seconds: 0,
    });
  });

  it("returns null for targets in the past or exactly now", () => {
    expect(computeTimeLeft(Math.floor(NOW_MS / 1000))).toBeNull();
    expect(computeTimeLeft(Math.floor(NOW_MS / 1000) - 1)).toBeNull();
    expect(computeTimeLeft("2020-01-01T00:00:00Z")).toBeNull();
  });
});

describe("normalizeGameTitle", () => {
  it("lowercases and collapses punctuation into single spaces", () => {
    expect(normalizeGameTitle("The Witcher 3: Wild Hunt")).toBe("the witcher 3 wild hunt");
    expect(normalizeGameTitle("Assassin's Creed")).toBe("assassin s creed");
    expect(normalizeGameTitle("  Elden   Ring  ")).toBe("elden ring");
  });

  it("keeps non-latin letters (Arabic)", () => {
    expect(normalizeGameTitle("  لعبة  ")).toBe("لعبة");
  });

  it("handles an empty title", () => {
    expect(normalizeGameTitle("")).toBe("");
  });
});

describe("igdbImageUrl", () => {
  it("builds an IGDB image URL for a size token", () => {
    expect(igdbImageUrl("abc123", "cover_big")).toBe(
      "https://images.igdb.com/igdb/image/upload/t_cover_big/abc123.webp",
    );
  });

  it("stringifies a missing id rather than throwing", () => {
    // Callers guard with `cover?.image_id` before calling; this documents that
    // the helper itself does not.
    expect(igdbImageUrl(null, "cover_small")).toContain("/null.webp");
  });
});
