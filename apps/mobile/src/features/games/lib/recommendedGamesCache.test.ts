import { describe, expect, it } from "vitest";
import {
  RECOMMENDED_GAMES_TTL_MS,
  isRecommendedGamesCacheFresh,
  recommendedGamesListHash,
  type CachedRecommendations,
} from "./recommendedGamesCache";

describe("recommendedGamesListHash", () => {
  it("ignores the order of ids inside a list", () => {
    expect(
      recommendedGamesListHash({ playing: [3, 1, 2], played: [], wantToPlay: [] }),
    ).toBe(
      recommendedGamesListHash({ playing: [1, 2, 3], played: [], wantToPlay: [] }),
    );
  });

  it("changes when a library gains a game", () => {
    const before = recommendedGamesListHash({
      playing: [1],
      played: [],
      wantToPlay: [],
    });
    const after = recommendedGamesListHash({
      playing: [1],
      played: [2],
      wantToPlay: [],
    });

    expect(before).not.toBe(after);
  });

  it("treats the three lists separately", () => {
    expect(
      recommendedGamesListHash({ playing: [1], played: [], wantToPlay: [] }),
    ).not.toBe(
      recommendedGamesListHash({ playing: [], played: [1], wantToPlay: [] }),
    );
  });
});

describe("isRecommendedGamesCacheFresh", () => {
  const cached: CachedRecommendations = {
    games: [],
    basedOnGenre: "RPG",
    fetchedAt: 1_000,
    listsHash: "hash-a",
  };

  it("rejects a missing cache", () => {
    expect(isRecommendedGamesCacheFresh(null, "hash-a", 1_000)).toBe(false);
  });

  it("rejects a cache built from a different library state", () => {
    expect(isRecommendedGamesCacheFresh(cached, "hash-b", 1_000)).toBe(false);
  });

  it("accepts a matching cache inside the TTL", () => {
    expect(
      isRecommendedGamesCacheFresh(
        cached,
        "hash-a",
        1_000 + RECOMMENDED_GAMES_TTL_MS - 1,
      ),
    ).toBe(true);
  });

  it("rejects a matching cache once the TTL has elapsed", () => {
    expect(
      isRecommendedGamesCacheFresh(cached, "hash-a", 1_000 + RECOMMENDED_GAMES_TTL_MS),
    ).toBe(false);
  });
});
