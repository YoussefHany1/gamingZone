import { describe, expect, it } from "vitest";
import { decodeQueryValue, readQueryParam } from "./callbackQuery";

describe("readQueryParam", () => {
  it("reads a parameter out of a linking deep link", () => {
    expect(readQueryParam("gaming-zone://steam-link?status=success", "status")).toBe(
      "success",
    );
  });

  it("reads a parameter that is not the first one", () => {
    expect(
      readQueryParam("gaming-zone://steam-link?status=success&steamId=7656119", "steamId"),
    ).toBe("7656119");
  });

  it("returns an empty string for a missing parameter", () => {
    expect(readQueryParam("gaming-zone://steam-link?status=success", "reason")).toBe("");
  });

  it("returns an empty string when there is no query at all", () => {
    expect(readQueryParam("gaming-zone://xbox-link", "status")).toBe("");
  });

  it("does not match a parameter name that is only a suffix of another one", () => {
    expect(readQueryParam("gaming-zone://steam-link?xstatus=success", "status")).toBe("");
  });
});

describe("decodeQueryValue", () => {
  it("decodes percent escapes", () => {
    expect(decodeQueryValue("no%20xbox%20profile")).toBe("no xbox profile");
  });

  it("keeps malformed escapes untouched instead of throwing", () => {
    expect(decodeQueryValue("100%")).toBe("100%");
  });
});
