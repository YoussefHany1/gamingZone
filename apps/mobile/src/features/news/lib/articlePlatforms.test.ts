import { describe, expect, it } from "vitest";
import { ARTICLE_PLATFORMS } from "@gaming-zone/core";
import {
  articlePlatformsOf,
  badgePlatformsOf,
  isArticlePlatform,
  isGeneralArticle,
} from "./articlePlatforms";

describe("isArticlePlatform", () => {
  it("accepts every canonical id", () => {
    for (const platform of ARTICLE_PLATFORMS) {
      expect(isArticlePlatform(platform)).toBe(true);
    }
  });

  it("rejects unknown ids and non-strings", () => {
    expect(isArticlePlatform("stadia")).toBe(false);
    expect(isArticlePlatform("all")).toBe(false);
    expect(isArticlePlatform(null)).toBe(false);
    expect(isArticlePlatform(42)).toBe(false);
  });

  it("accepts mixed-case input", () => {
    expect(isArticlePlatform("PC")).toBe(true);
    expect(isArticlePlatform(" PlayStation ")).toBe(true);
  });
});

describe("articlePlatformsOf", () => {
  it("returns canonical order regardless of stored order", () => {
    expect(articlePlatformsOf({ platforms: ["ios", "pc", "xbox", "pc"] })).toEqual([
      "pc",
      "xbox",
      "ios",
    ]);
  });

  it("drops unknown and duplicate values", () => {
    expect(articlePlatformsOf({ platforms: ["stadia", "nintendo", "nintendo"] })).toEqual([
      "nintendo",
    ]);
  });

  it("returns [] for legacy or malformed documents", () => {
    expect(articlePlatformsOf({})).toEqual([]);
    expect(articlePlatformsOf({ platforms: null })).toEqual([]);
    expect(articlePlatformsOf({ platforms: "pc" })).toEqual([]);
    expect(articlePlatformsOf(null)).toEqual([]);
    expect(articlePlatformsOf(undefined)).toEqual([]);
  });
});

describe("isGeneralArticle", () => {
  it("treats an all-platform article as general", () => {
    expect(isGeneralArticle([...ARTICLE_PLATFORMS])).toBe(true);
  });

  it("does not treat a single-platform article as general", () => {
    expect(isGeneralArticle(["pc"])).toBe(false);
    expect(isGeneralArticle([])).toBe(false);
  });
});

describe("badgePlatformsOf", () => {
  it("returns the platforms to show for a specific article", () => {
    expect(badgePlatformsOf({ platforms: ["xbox", "pc"] })).toEqual(["pc", "xbox"]);
  });

  it("returns [] for general articles so the badge row stays hidden", () => {
    expect(badgePlatformsOf({ platforms: [...ARTICLE_PLATFORMS] })).toEqual([]);
  });

  it("returns [] for unclassified articles", () => {
    expect(badgePlatformsOf({})).toEqual([]);
  });
});
