import { describe, expect, it } from "vitest";
import {
  RAM_MAX_GB,
  RAM_MIN_GB,
  STORAGE_MAX_GB,
  STORAGE_MIN_GB,
  isCustomGbInvalid,
  isCustomValue,
  parseCustomGb,
} from "./pcSpecsForm";

describe("parseCustomGb", () => {
  it("parses plain integers", () => {
    expect(parseCustomGb("16", RAM_MIN_GB, RAM_MAX_GB)).toBe(16);
    expect(parseCustomGb(" 2000 ", STORAGE_MIN_GB, STORAGE_MAX_GB)).toBe(2000);
    expect(parseCustomGb("0", STORAGE_MIN_GB, STORAGE_MAX_GB)).toBe(0);
  });

  it("clamps into the validator's bounds", () => {
    expect(parseCustomGb("0", RAM_MIN_GB, RAM_MAX_GB)).toBe(RAM_MIN_GB);
    expect(parseCustomGb("9999", RAM_MIN_GB, RAM_MAX_GB)).toBe(RAM_MAX_GB);
    expect(parseCustomGb("-5", STORAGE_MIN_GB, STORAGE_MAX_GB)).toBeNull();
    expect(parseCustomGb("200000", STORAGE_MIN_GB, STORAGE_MAX_GB)).toBe(STORAGE_MAX_GB);
  });

  it("rejects non-numeric text", () => {
    expect(parseCustomGb("", RAM_MIN_GB, RAM_MAX_GB)).toBeNull();
    expect(parseCustomGb("abc", RAM_MIN_GB, RAM_MAX_GB)).toBeNull();
    expect(parseCustomGb("1.5", RAM_MIN_GB, RAM_MAX_GB)).toBeNull();
    expect(parseCustomGb("12 GB", RAM_MIN_GB, RAM_MAX_GB)).toBeNull();
  });
});

describe("isCustomGbInvalid", () => {
  it("accepts in-range values", () => {
    expect(isCustomGbInvalid("24", RAM_MIN_GB, RAM_MAX_GB)).toBe(false);
    expect(isCustomGbInvalid("1024", RAM_MIN_GB, RAM_MAX_GB)).toBe(false);
  });

  it("flags out-of-range and non-numeric values", () => {
    expect(isCustomGbInvalid("0", RAM_MIN_GB, RAM_MAX_GB)).toBe(true);
    expect(isCustomGbInvalid("5000", RAM_MIN_GB, RAM_MAX_GB)).toBe(true);
    expect(isCustomGbInvalid("", RAM_MIN_GB, RAM_MAX_GB)).toBe(true);
    expect(isCustomGbInvalid("abc", RAM_MIN_GB, RAM_MAX_GB)).toBe(true);
  });
});

describe("isCustomValue", () => {
  it("detects values outside the chip options", () => {
    expect(isCustomValue([4, 8, 16, 32], 16)).toBe(false);
    expect(isCustomValue([4, 8, 16, 32], 24)).toBe(true);
  });
});
