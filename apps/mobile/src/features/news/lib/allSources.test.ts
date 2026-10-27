import { describe, expect, it } from "vitest";
import {
  ALL_LANGUAGES_NAME,
  ALL_SOURCES_NAME,
  ARABIC_SOURCES_NAME,
  ENGLISH_SOURCES_NAME,
  isAllSourcesName,
} from "./allSources";

describe("isAllSourcesName", () => {
  it("accepts every synthetic all-sources name", () => {
    for (const name of [
      ALL_SOURCES_NAME,
      ALL_LANGUAGES_NAME,
      ARABIC_SOURCES_NAME,
      ENGLISH_SOURCES_NAME,
    ]) {
      expect(isAllSourcesName(name)).toBe(true);
    }
  });

  it("accepts the language-suffixed names", () => {
    // Regression: these start with "__all_", not "__all__", so a
    // startsWith("__all__") check silently treated them as real sites and
    // filtered the feed by a non-existent siteName.
    expect(ALL_LANGUAGES_NAME.startsWith("__all__")).toBe(false);
    expect(isAllSourcesName(ALL_LANGUAGES_NAME)).toBe(true);
    expect(isAllSourcesName(ARABIC_SOURCES_NAME)).toBe(true);
    expect(isAllSourcesName(ENGLISH_SOURCES_NAME)).toBe(true);
  });

  it("rejects real sources and non-strings", () => {
    expect(isAllSourcesName("Eurogamer")).toBe(false);
    expect(isAllSourcesName("__all")).toBe(false);
    expect(isAllSourcesName("")).toBe(false);
    expect(isAllSourcesName(undefined)).toBe(false);
    expect(isAllSourcesName(null)).toBe(false);
  });
});
