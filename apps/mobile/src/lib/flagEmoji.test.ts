import { describe, expect, it } from "vitest";
import { flagEmoji } from "./flagEmoji";

describe("flagEmoji", () => {
  it("converts a two-letter country code to regional-indicator symbols", () => {
    // U+1F1FA is regional indicator "U", U+1F1F8 is regional indicator "S".
    expect(flagEmoji("US")).toBe("\u{1F1FA}\u{1F1F8}");
    // U+1F1F8 "S", U+1F1E6 "A".
    expect(flagEmoji("SA")).toBe("\u{1F1F8}\u{1F1E6}");
  });

  it("accepts lowercase codes", () => {
    expect(flagEmoji("gb")).toBe(flagEmoji("GB"));
    // U+1F1EC "G", U+1F1E7 "B".
    expect(flagEmoji("gb")).toBe("\u{1F1EC}\u{1F1E7}");
  });

  it("returns an empty string for anything that is not a two-letter code", () => {
    expect(flagEmoji("")).toBe("");
    expect(flagEmoji("U")).toBe("");
    expect(flagEmoji("USA")).toBe("");
    expect(flagEmoji("U1")).toBe("");
    expect(flagEmoji("12")).toBe("");
    expect(flagEmoji("U-")).toBe("");
  });
});
