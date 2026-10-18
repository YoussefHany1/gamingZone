import { describe, expect, it } from "vitest";
import { LANGUAGE_CODES, LANGUAGE_LABELS, resolveLanguageCode } from "./languages";

describe("LANGUAGE_LABELS", () => {
  it("keeps Portuguese regions distinct", () => {
    expect(LANGUAGE_LABELS["pt-BR"]).toBe("Português (Brasil)");
    expect(LANGUAGE_LABELS["pt-PT"]).toBe("Português (Portugal)");
  });
});

describe("LANGUAGE_CODES", () => {
  it("lists every label, in selector order", () => {
    expect(LANGUAGE_CODES).toEqual(["en", "ar", "es", "fr", "hi", "pt-BR", "pt-PT"]);
  });
});

describe("resolveLanguageCode", () => {
  it("resolves bare codes", () => {
    expect(resolveLanguageCode("en")).toBe("en");
    expect(resolveLanguageCode("ar")).toBe("ar");
    expect(resolveLanguageCode("es")).toBe("es");
    expect(resolveLanguageCode("fr")).toBe("fr");
    expect(resolveLanguageCode("hi")).toBe("hi");
  });

  it("resolves region-tagged codes to their base language", () => {
    expect(resolveLanguageCode("ar-SA")).toBe("ar");
    expect(resolveLanguageCode("es-MX")).toBe("es");
    expect(resolveLanguageCode("fr-CA")).toBe("fr");
  });

  it("keeps Portuguese regions distinct", () => {
    expect(resolveLanguageCode("pt-BR")).toBe("pt-BR");
    expect(resolveLanguageCode("pt-PT")).toBe("pt-PT");
  });

  it("falls back to English for unsupported languages", () => {
    expect(resolveLanguageCode("de")).toBe("en");
    expect(resolveLanguageCode("")).toBe("en");
  });

  it("maps a bare 'pt' to English (current behaviour — see review note)", () => {
    // Neither "pt-PT" nor "pt-BR" is a prefix of "pt", so a device locale of
    // plain "pt" resolves to English. Arguably it should resolve to "pt-PT";
    // asserted here so the behaviour cannot change silently.
    expect(resolveLanguageCode("pt")).toBe("en");
  });
});
