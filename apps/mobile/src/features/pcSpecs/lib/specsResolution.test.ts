import { describe, expect, it } from "vitest";
import type { PcSpecs } from "@gaming-zone/core";
import { resolvePcSpecsForUser } from "./specsResolution";

const specs = (ramGb: number, updatedAt: number): PcSpecs => ({
  cpuId: "intel-core-i5-12400",
  gpuId: "nvidia-geforce-rtx-3060-12gb",
  ramGb,
  freeStorageGb: 200,
  updatedAt,
});

describe("resolvePcSpecsForUser", () => {
  it("uses the guest copy for anonymous users and ignores account data", () => {
    const result = resolvePcSpecsForUser({
      isAnonymous: true,
      remote: specs(32, 3),
      localAccount: specs(32, 3),
      guest: specs(8, 1),
    });

    expect(result.specs).toEqual(specs(8, 1));
    expect(result.source).toBe("guest");
    expect(result.upload).toBeNull();
    expect(result.clearGuest).toBe(false);
  });

  it("returns nothing for an anonymous user with no guest copy", () => {
    const result = resolvePcSpecsForUser({
      isAnonymous: true,
      remote: specs(32, 3),
      localAccount: specs(32, 3),
      guest: null,
    });

    expect(result.specs).toBeNull();
    expect(result.source).toBeNull();
  });

  it("lets the account win over a newer guest copy", () => {
    const result = resolvePcSpecsForUser({
      isAnonymous: false,
      remote: specs(16, 10),
      localAccount: specs(16, 10),
      guest: specs(8, 20),
    });

    expect(result.specs).toEqual(specs(16, 10));
    expect(result.source).toBe("account");
    expect(result.upload).toBeNull();
    expect(result.clearGuest).toBe(true);
  });

  it("migrates the guest copy when the account has none", () => {
    const result = resolvePcSpecsForUser({
      isAnonymous: false,
      remote: null,
      localAccount: null,
      guest: specs(8, 5),
    });

    expect(result.specs).toEqual(specs(8, 5));
    expect(result.source).toBe("guest");
    expect(result.upload).toEqual(specs(8, 5));
    expect(result.clearGuest).toBe(false);
  });

  it("repairs a missing account from the newest local copy", () => {
    const result = resolvePcSpecsForUser({
      isAnonymous: false,
      remote: null,
      localAccount: specs(16, 10),
      guest: specs(8, 5),
    });

    expect(result.specs).toEqual(specs(16, 10));
    expect(result.source).toBe("local");
    expect(result.upload).toEqual(specs(16, 10));
  });

  it("prefers a newer guest copy over a stale local copy", () => {
    const result = resolvePcSpecsForUser({
      isAnonymous: false,
      remote: undefined,
      localAccount: specs(16, 5),
      guest: specs(8, 10),
    });

    expect(result.source).toBe("guest");
    expect(result.upload).toEqual(specs(8, 10));
  });

  it("ignores malformed values and reports nothing configured", () => {
    const result = resolvePcSpecsForUser({
      isAnonymous: false,
      remote: { cpuId: "missing" },
      localAccount: null,
      guest: { ramGb: "lots" },
    });

    expect(result.specs).toBeNull();
    expect(result.upload).toBeNull();
    expect(result.source).toBeNull();
    expect(result.clearGuest).toBe(true);
  });
});
