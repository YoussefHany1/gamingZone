import { describe, expect, it } from "vitest";
import { mapPrivacy, mapPublicProfile, mapStatus, timestampToMillis } from "./profileMapper";

describe("timestampToMillis", () => {
  it("reads Firestore-like Timestamps and numbers", () => {
    expect(timestampToMillis({ toMillis: () => 123 })).toBe(123);
    expect(timestampToMillis(456)).toBe(456);
  });

  it("returns null for anything else", () => {
    expect(timestampToMillis(undefined)).toBeNull();
    expect(timestampToMillis("789")).toBeNull();
    expect(timestampToMillis(Number.NaN)).toBeNull();
  });
});

describe("mapStatus", () => {
  it("requires text", () => {
    expect(mapStatus({ text: "  " })).toBeNull();
    expect(mapStatus(null)).toBeNull();
  });

  it("maps text, emoji and timestamp", () => {
    expect(mapStatus({ text: " In queue ", emoji: "🎮", updatedAt: 10 })).toEqual({
      text: "In queue",
      emoji: "🎮",
      updatedAt: 10,
    });
  });
});

describe("mapPrivacy", () => {
  it("fills missing flags from the defaults", () => {
    expect(mapPrivacy({ discoverable: false })).toEqual({
      discoverable: false,
      showLinks: true,
      showStats: false,
    });
    expect(mapPrivacy(undefined)).toEqual({
      discoverable: true,
      showLinks: true,
      showStats: false,
    });
  });
});

describe("mapPublicProfile", () => {
  it("returns null until a handle has been claimed", () => {
    expect(mapPublicProfile("u1", { displayName: "Player" })).toBeNull();
    expect(mapPublicProfile("u1", undefined)).toBeNull();
  });

  it("maps the document and defaults", () => {
    const profile = mapPublicProfile("u1", {
      handle: "Player_One",
      handleLower: "player_one",
      displayName: "Player One",
      photoURL: null,
      bannerURL: "https://cdn/banner.png",
      bio: "  hi  ",
      status: { text: "In queue", emoji: "🎮", updatedAt: 5 },
      platform: "pc",
      country: "EG",
      links: {
        steam: { platform: "steam", identifier: "7656119", visible: true, linkedAt: 1 },
        psn: { identifier: "   " },
        nintendo: { identifier: "ignored" },
      },
      privacy: { discoverable: true, showLinks: true, showStats: true },
      counts: { friends: 2, sessions: 3 },
      createdAt: 99,
    });

    expect(profile).not.toBeNull();
    expect(profile).toMatchObject({
      uid: "u1",
      handle: "Player_One",
      handleLower: "player_one",
      displayName: "Player One",
      bannerURL: "https://cdn/banner.png",
      bio: "  hi  ",
      platform: "pc",
      country: "EG",
      counts: { friends: 2, sessions: 3 },
      createdAt: 99,
    });
    expect(profile?.status).toEqual({ text: "In queue", emoji: "🎮", updatedAt: 5 });
    expect(profile?.links.steam?.identifier).toBe("7656119");
    expect(profile?.links.psn).toBeUndefined();
    expect(profile?.links).not.toHaveProperty("nintendo");
  });

  it("falls back to the handle when handleLower is missing", () => {
    const profile = mapPublicProfile("u1", { handle: "Name" });
    expect(profile?.handleLower).toBe("name");
    expect(profile?.privacy.discoverable).toBe(true);
  });
});
