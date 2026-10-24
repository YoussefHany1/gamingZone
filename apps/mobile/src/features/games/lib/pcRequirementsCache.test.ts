import { describe, expect, it } from "vitest";
import type { PcRequirements } from "@gaming-zone/core";
import {
  PC_REQUIREMENTS_CACHE_LIMIT,
  PC_REQUIREMENTS_CACHE_TTL_MS,
  isPcRequirementsCacheFresh,
  mergePcRequirementsCache,
  parseRequirementsValue,
  prunePcRequirementsCache,
  readPcRequirementsCache,
  type PcRequirementsCache,
} from "./pcRequirementsCache";

const requirements = (minimum = "Processor: Intel Core i5"): PcRequirements => ({
  minimum: [{ label: "Processor", value: minimum }],
  recommended: [],
});

const entry = (fetchedAt: number, value: PcRequirements | null = requirements()) => ({
  requirements: value,
  fetchedAt,
});

describe("parseRequirementsValue", () => {
  it("parses both Steam tiers into rows", () => {
    const parsed = parseRequirementsValue({
      minimum: "<li>Processor: Intel Core i5</li><li>Memory: 8 GB RAM</li>",
      recommended: "<li>Graphics: NVIDIA GTX 1060</li>",
    });

    expect(parsed?.minimum).toEqual([
      { label: "Processor", value: "Intel Core i5" },
      { label: "Memory", value: "8 GB RAM" },
    ]);
    expect(parsed?.recommended).toEqual([
      { label: "Graphics", value: "NVIDIA GTX 1060" },
    ]);
  });

  it("returns null for missing or empty tiers", () => {
    expect(parseRequirementsValue(null)).toBeNull();
    expect(parseRequirementsValue({ minimum: null, recommended: null })).toBeNull();
    expect(
      parseRequirementsValue({ minimum: "<div>no colon</div>", recommended: null }),
    ).toBeNull();
  });
});

describe("cache freshness", () => {
  it("expires after the TTL", () => {
    const now = 1_000_000;
    expect(isPcRequirementsCacheFresh(entry(now), now)).toBe(true);
    expect(
      isPcRequirementsCacheFresh(entry(now - PC_REQUIREMENTS_CACHE_TTL_MS), now),
    ).toBe(false);
  });

  it("treats a missing entry as stale", () => {
    expect(isPcRequirementsCacheFresh(undefined)).toBe(false);
  });
});

describe("readPcRequirementsCache", () => {
  it("parses a raw JSON object and drops expired entries", () => {
    const now = 10 * PC_REQUIREMENTS_CACHE_TTL_MS;
    const raw = JSON.stringify({
      1: entry(now),
      2: entry(now - PC_REQUIREMENTS_CACHE_TTL_MS),
    });

    const cache = readPcRequirementsCache(raw, now);
    expect(Object.keys(cache)).toEqual(["1"]);
    expect(cache["1"]?.requirements).toEqual(requirements());
  });

  it("discards malformed values instead of throwing", () => {
    const now = Date.now();
    const cache = readPcRequirementsCache(
      {
        1: { requirements: { minimum: "nope", recommended: [] }, fetchedAt: now },
        2: { requirements: null, fetchedAt: "yesterday" },
        3: { requirements: null, fetchedAt: now },
      },
      now,
    );

    expect(Object.keys(cache)).toEqual(["3"]);
    expect(cache["3"]?.requirements).toBeNull();
  });

  it("returns an empty cache for junk input", () => {
    expect(readPcRequirementsCache(null)).toEqual({});
    expect(readPcRequirementsCache("{")).toEqual({});
    expect(readPcRequirementsCache([])).toEqual({});
  });
});

describe("mergePcRequirementsCache", () => {
  it("upserts fetched games and refreshes their timestamp", () => {
    const now = 5_000;
    const cache: PcRequirementsCache = {
      1: entry(1_000, null),
      2: entry(2_000),
    };

    const merged = mergePcRequirementsCache(
      cache,
      [{ gameId: 1, requirements: requirements("Intel Core i7") }],
      now,
    );

    expect(merged["1"]?.requirements?.minimum[0]?.value).toBe("Intel Core i7");
    expect(merged["1"]?.fetchedAt).toBe(now);
    expect(merged["2"]).toEqual(entry(2_000));
  });

  it("keeps only the newest entries up to the limit", () => {
    let cache: PcRequirementsCache = {};
    const now = Date.now();
    for (let i = 0; i < PC_REQUIREMENTS_CACHE_LIMIT + 5; i += 1) {
      cache = mergePcRequirementsCache(
        cache,
        [{ gameId: i, requirements: null }],
        now + i,
      );
    }

    expect(Object.keys(cache)).toHaveLength(PC_REQUIREMENTS_CACHE_LIMIT);
    expect(cache["0"]).toBeUndefined();
    expect(
      cache[String(PC_REQUIREMENTS_CACHE_LIMIT + 4)]?.fetchedAt,
    ).toBe(now + PC_REQUIREMENTS_CACHE_LIMIT + 4);
  });
});

describe("prunePcRequirementsCache", () => {
  it("does not mutate its input", () => {
    const now = 10_000;
    const cache: PcRequirementsCache = {
      1: entry(now - PC_REQUIREMENTS_CACHE_TTL_MS),
      2: entry(now),
    };

    const pruned = prunePcRequirementsCache(cache, now);
    expect(Object.keys(pruned)).toEqual(["2"]);
    expect(Object.keys(cache)).toHaveLength(2);
  });
});
