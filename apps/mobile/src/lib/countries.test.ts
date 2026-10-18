import { describe, expect, it } from "vitest";
import {
  COUNTRY_LOCALES,
  EXCLUDED_COUNTRY_CODES,
  buildCountryOptions,
  resolveCountryLocale,
} from "./countries";

describe("resolveCountryLocale", () => {
  it("resolves every locale the app ships a bundle for", () => {
    for (const locale of COUNTRY_LOCALES) {
      expect(resolveCountryLocale(locale)).toBe(locale);
    }
  });

  it("collapses a region tag to the bundle that exists", () => {
    expect(resolveCountryLocale("pt-BR")).toBe("pt");
    expect(resolveCountryLocale("pt-PT")).toBe("pt");
    expect(resolveCountryLocale("ar-SA")).toBe("ar");
    expect(resolveCountryLocale("es-MX")).toBe("es");
    expect(resolveCountryLocale("fr-CA")).toBe("fr");
  });

  it("falls back to English for unsupported or empty languages", () => {
    expect(resolveCountryLocale("de")).toBe("en");
    expect(resolveCountryLocale("")).toBe("en");
  });
});

describe("EXCLUDED_COUNTRY_CODES", () => {
  it("keeps IL out of the pickers", () => {
    expect(EXCLUDED_COUNTRY_CODES.has("IL")).toBe(true);
  });
});

describe("buildCountryOptions", () => {
  it("returns the full ISO country set minus the excluded codes", () => {
    const options = buildCountryOptions("en");

    expect(options.length).toBeGreaterThan(200);
    expect(options.some((option) => option.value === "US")).toBe(true);
    expect(options.some((option) => option.value === "IL")).toBe(false);
  });

  it("uses alpha-2 codes with non-empty labels", () => {
    for (const option of buildCountryOptions("en")) {
      expect(option.value).toMatch(/^[A-Z]{2}$/);
      expect(option.label.length).toBeGreaterThan(0);
    }
  });

  it("sorts by the localised label", () => {
    const labels = buildCountryOptions("en").map((option) => option.label);
    const sorted = [...labels].sort((a, b) => a.localeCompare(b));

    expect(labels).toEqual(sorted);
  });

  it("localises the labels", () => {
    const english = buildCountryOptions("en").find((option) => option.value === "SA");
    const arabic = buildCountryOptions("ar").find((option) => option.value === "SA");

    expect(english?.label).toBeTruthy();
    expect(arabic?.label).toBeTruthy();
    expect(english?.label).not.toBe(arabic?.label);
  });
});
