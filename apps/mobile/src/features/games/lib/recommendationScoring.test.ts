import { describe, expect, it } from "vitest";
import type { Game } from "@/src/types/sharedTypes";
import {
  RECOMMENDATION_COUNT,
  collectGameSignals,
  filterByUserPlatform,
  pickDiverseRecommendations,
  rankRecommendations,
} from "./recommendationScoring";

function game(id: number, overrides: Partial<Game> = {}): Game {
  return { id, name: `Game ${id}`, ...overrides };
}

describe("collectGameSignals", () => {
  it("weights similar games by how early their source game was played", () => {
    const gamesById = new Map<number, Game>([
      [1, game(1, { similar_games: [{ id: 100 }] })],
      [2, game(2, { similar_games: [{ id: 100 }, { id: 200 }] })],
    ]);

    const { ids, weights } = collectGameSignals([1, 2], gamesById, new Set());

    expect([...ids].sort((a, b) => a - b)).toEqual([100, 200]);
    // Game 1 is the most-played title (weight 10), game 2 the second (weight 9).
    expect(weights[100]).toBe(19);
    expect(weights[200]).toBe(9);
  });

  it("excludes games that are already in a library", () => {
    const gamesById = new Map<number, Game>([
      [1, game(1, { similar_games: [{ id: 100 }, { id: 200 }] })],
    ]);

    const { ids } = collectGameSignals([1], gamesById, new Set([100]));

    expect(ids.has(100)).toBe(false);
    expect(ids.has(200)).toBe(true);
  });

  it("orders genres by frequency and keeps only the top three", () => {
    const gamesById = new Map<number, Game>([
      [1, game(1, { genres: [{ name: "RPG" }, { name: "Indie" }] })],
      [2, game(2, { genres: [{ name: "RPG" }] })],
      [
        3,
        game(3, {
          genres: [{ name: "RPG" }, { name: "Indie" }, { name: "Strategy" }],
        }),
      ],
      [4, game(4, { genres: [{ name: "Shooter" }] })],
    ]);

    const { topGenres } = collectGameSignals([1, 2, 3, 4], gamesById, new Set());

    expect(topGenres).toHaveLength(3);
    expect(topGenres[0]).toBe("RPG");
    expect(topGenres[1]).toBe("Indie");
  });

  it("ignores ids it has no details for", () => {
    const { ids, topGenres } = collectGameSignals([99], new Map(), new Set());

    expect(ids.size).toBe(0);
    expect(topGenres).toEqual([]);
  });
});

describe("filterByUserPlatform", () => {
  it("drops add-ons even when no platform preference is stored", () => {
    const games = [game(1, { category: 0 }), game(2, { category: 1 }), game(3)];

    expect(filterByUserPlatform(games, null).map((entry) => entry.id)).toEqual([
      1, 3,
    ]);
  });

  it("keeps everything else when no platform preference is stored", () => {
    const games = [game(1, { platforms: [{ name: "PC (Windows)" }] }), game(2)];

    expect(filterByUserPlatform(games, null)).toHaveLength(2);
  });

  it("drops games with no platform list when a preference is stored", () => {
    expect(filterByUserPlatform([game(1)], "pc")).toEqual([]);
  });

  it("matches the PlayStation family by name or PS abbreviation", () => {
    const games = [
      game(1, { platforms: [{ name: "PlayStation 5" }] }),
      game(2, { platforms: [{ name: "Console", abbreviation: "PS4" }] }),
      game(3, { platforms: [{ name: "Xbox Series X" }] }),
    ];

    expect(
      filterByUserPlatform(games, "playstation").map((entry) => entry.id),
    ).toEqual([1, 2]);
  });

  it("matches PC by name or by Windows", () => {
    const games = [
      game(1, { platforms: [{ name: "PC (Windows)" }] }),
      game(2, { platforms: [{ name: "Windows 10" }] }),
      game(3, { platforms: [{ name: "Linux" }] }),
    ];

    expect(filterByUserPlatform(games, "pc").map((entry) => entry.id)).toEqual([
      1, 2,
    ]);
  });

  it("falls back to a name or abbreviation match for other platforms", () => {
    const games = [
      game(1, { platforms: [{ name: "Nintendo Switch" }] }),
      game(2, { platforms: [{ name: "Unknown console", abbreviation: "NSW" }] }),
    ];

    expect(
      filterByUserPlatform(games, "nintendo").map((entry) => entry.id),
    ).toEqual([1]);
    expect(filterByUserPlatform(games, "nsw").map((entry) => entry.id)).toEqual([
      2,
    ]);
  });
});

describe("rankRecommendations", () => {
  it("drops games below the score threshold", () => {
    const unrated = game(1); // unrated games score 50
    const rated = game(2, { total_rating: 65 });

    expect(
      rankRecommendations([unrated, rated], [], {}).map((entry) => entry.id),
    ).toEqual([2]);
  });

  it("adds a genre bonus for the user's top genres", () => {
    const withoutGenre = game(1, { total_rating: 55 });
    const withGenre = game(2, { total_rating: 55, genres: [{ name: "RPG" }] });

    // 55 is below the threshold; only the +15 genre bonus lifts the second game.
    expect(
      rankRecommendations([withoutGenre, withGenre], ["RPG"], {}).map(
        (entry) => entry.id,
      ),
    ).toEqual([2]);
  });

  it("adds twice the similar-game weight", () => {
    const ranked = rankRecommendations([game(1, { total_rating: 50 })], [], {
      1: 6,
    });

    // 50 + (6 * 2) = 62
    expect(ranked).toHaveLength(1);
  });

  it("orders the survivors by score, highest first", () => {
    const ranked = rankRecommendations(
      [game(1, { total_rating: 61 }), game(2, { total_rating: 90 })],
      [],
      {},
    );

    expect(ranked.map((entry) => entry.id)).toEqual([2, 1]);
  });
});

describe("pickDiverseRecommendations", () => {
  // Descending scores, so the first entries are the strongest candidates.
  const ranked = Array.from({ length: 30 }, (_, index) =>
    game(index, { total_rating: 100 - index }),
  );

  it("returns at most the recommendation count", () => {
    expect(pickDiverseRecommendations(ranked)).toHaveLength(RECOMMENDATION_COUNT);
  });

  it("never reaches beyond the strongest candidates", () => {
    // The shuffle pool is the top 20, so ids 20+ can never be selected.
    expect(pickDiverseRecommendations(ranked).every((entry) => entry.id < 20)).toBe(
      true,
    );
  });

  it("returns distinct games", () => {
    const picked = pickDiverseRecommendations(ranked, () => 0.5);

    expect(new Set(picked.map((entry) => entry.id)).size).toBe(picked.length);
  });

  it("keeps the whole pool when it is no larger than the count", () => {
    const pool = ranked.slice(0, RECOMMENDATION_COUNT);
    const picked = pickDiverseRecommendations(pool, () => 0);

    expect(
      picked.map((entry) => entry.id).sort((a, b) => a - b),
    ).toEqual(pool.map((entry) => entry.id));
  });
});
