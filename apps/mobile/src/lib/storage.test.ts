import { describe, expect, it, vi } from "vitest";

vi.mock("react-native-mmkv", () => ({
  createMMKV: () => ({
    getString: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  }),
}));

import { isSecretLikeKey } from "./storage";

describe("storage key guard", () => {
  it("allows user-scoped cache keys whose uid contains credential substrings", () => {
    expect(isSecretLikeKey("USER_STATS_zWpyNNNlFcMW3VjhXSiyJdhREDH2")).toBe(false);
    expect(
      isSecretLikeKey("USER_STATS_zWpyNNNlFcMW3VjhXSiyJdhREDH2_timestamp"),
    ).toBe(false);
  });

  it("rejects credential-style key segments", () => {
    expect(isSecretLikeKey("FCM_TOKEN")).toBe(true);
    expect(isSecretLikeKey("USER_SECRET")).toBe(true);
    expect(isSecretLikeKey("refreshToken")).toBe(true);
    expect(isSecretLikeKey("api_key")).toBe(true);
  });
});
