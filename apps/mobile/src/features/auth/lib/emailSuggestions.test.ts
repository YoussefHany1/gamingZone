import { describe, expect, it } from "vitest";
import {
  applyEmailDomain,
  COMMON_EMAIL_DOMAINS,
  getEmailDomainSuggestions,
} from "./emailSuggestions";
import { normalizeEmail } from "./validation";

describe("getEmailDomainSuggestions", () => {
  it("returns nothing for an empty field", () => {
    expect(getEmailDomainSuggestions("")).toEqual([]);
    expect(getEmailDomainSuggestions("   ")).toEqual([]);
  });

  it("suggests every common domain once a local part is typed", () => {
    expect(getEmailDomainSuggestions("player")).toEqual([
      ...COMMON_EMAIL_DOMAINS,
    ]);
  });

  it("filters by the partial domain", () => {
    expect(getEmailDomainSuggestions("player@gm")).toEqual(["gmail.com"]);
    expect(getEmailDomainSuggestions("player@out")).toEqual(["outlook.com"]);
  });

  it("hides suggestions once the domain is complete", () => {
    expect(getEmailDomainSuggestions("player@gmail.com")).toEqual([]);
  });

  it("ignores surrounding whitespace", () => {
    expect(getEmailDomainSuggestions("  player@ya  ")).toEqual(["yahoo.com"]);
  });
});

describe("applyEmailDomain", () => {
  it("adds a domain when only the local part exists", () => {
    expect(applyEmailDomain("player", "gmail.com")).toBe("player@gmail.com");
  });

  it("replaces a partial domain", () => {
    expect(applyEmailDomain("player@yah", "yahoo.com")).toBe(
      "player@yahoo.com",
    );
  });

  it("returns an empty string when there is no local part", () => {
    expect(applyEmailDomain("", "gmail.com")).toBe("");
    expect(applyEmailDomain("@gmail.com", "gmail.com")).toBe("");
  });
});

describe("normalizeEmail", () => {
  it("trims leading and trailing whitespace", () => {
    expect(normalizeEmail("  player@example.com  ")).toBe(
      "player@example.com",
    );
  });
});
