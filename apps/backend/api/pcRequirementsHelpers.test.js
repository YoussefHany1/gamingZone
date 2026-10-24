import { describe, expect, it } from 'vitest';
import {
  MAX_GAME_IDS,
  mapSteamAppIds,
  normalizeSteamRequirements,
  parseGameIds,
  steamAppIdFromWebsites,
} from './pcRequirementsHelpers.js';

describe('parseGameIds', () => {
  it('parses, dedupes and validates ids', () => {
    expect(parseGameIds('1, 2,2, 300, -5, nope, 0')).toEqual([1, 2, 300]);
  });

  it('accepts repeated query parameters', () => {
    expect(parseGameIds(['4', '5,6'])).toEqual([4, 5, 6]);
  });

  it('caps the request size', () => {
    const ids = Array.from({ length: 60 }, (_, index) => index + 1).join(',');
    expect(parseGameIds(ids)).toHaveLength(MAX_GAME_IDS);
  });

  it('ignores non-string input', () => {
    expect(parseGameIds(undefined)).toEqual([]);
    expect(parseGameIds(null)).toEqual([]);
    expect(parseGameIds({})).toEqual([]);
  });
});

describe('steamAppIdFromWebsites', () => {
  it('returns the store app id', () => {
    expect(
      steamAppIdFromWebsites([
        { type: 1, url: 'https://example.com' },
        { type: 13, url: 'https://store.steampowered.com/app/1091500/cyberpunk_2077/' },
      ]),
    ).toBe('1091500');
  });

  it('returns null for missing or malformed Steam links', () => {
    expect(steamAppIdFromWebsites(undefined)).toBeNull();
    expect(steamAppIdFromWebsites([{ type: 13, url: 'https://store.steampowered.com/' }])).toBeNull();
    expect(steamAppIdFromWebsites([{ type: 13, url: null }])).toBeNull();
  });
});

describe('mapSteamAppIds', () => {
  it('maps every IGDB id, including games without a Steam page', () => {
    const result = mapSteamAppIds([
      {
        id: 10,
        websites: [{ type: 13, url: 'https://store.steampowered.com/app/123/' }],
      },
      { id: 20, websites: [{ type: 1, url: 'https://example.com' }] },
      { id: 30 },
    ]);

    expect(result.get(10)).toBe('123');
    expect(result.get(20)).toBeNull();
    expect(result.get(30)).toBeNull();
  });

  it('tolerates a malformed payload', () => {
    expect(mapSteamAppIds(null).size).toBe(0);
    expect(mapSteamAppIds([null, { id: 'x' }]).size).toBe(0);
  });
});

describe('normalizeSteamRequirements', () => {
  it('keeps the usual object shape', () => {
    expect(
      normalizeSteamRequirements({ minimum: '<p>Min</p>', recommended: '<p>Rec</p>' }),
    ).toEqual({ minimum: '<p>Min</p>', recommended: '<p>Rec</p>' });
  });

  it('accepts the legacy string shape', () => {
    expect(normalizeSteamRequirements('<p>Min</p>')).toEqual({
      minimum: '<p>Min</p>',
      recommended: null,
    });
  });

  it('drops empty tiers', () => {
    expect(normalizeSteamRequirements({ minimum: '  ' })).toBeNull();
    expect(normalizeSteamRequirements({})).toBeNull();
    expect(normalizeSteamRequirements(null)).toBeNull();
    expect(normalizeSteamRequirements(42)).toBeNull();
  });
});
