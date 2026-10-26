import { describe, it, expect } from 'vitest';

import {
  ALL_PLATFORMS,
  ARTICLE_PLATFORMS,
  detectPlatformsFromText,
  normalizePlatform,
  parseAiPlatforms,
  resolveArticlePlatforms,
  sortPlatforms,
} from './articlePlatforms';

describe('ARTICLE_PLATFORMS', () => {
  it('is the six ids the mobile app filters on, in display order', () => {
    expect(ARTICLE_PLATFORMS).toEqual(['pc', 'playstation', 'xbox', 'nintendo', 'android', 'ios']);
    expect(ALL_PLATFORMS).toEqual(ARTICLE_PLATFORMS);
  });
});

describe('sortPlatforms', () => {
  it('dedupes and returns canonical order regardless of input order', () => {
    expect(sortPlatforms(['ios', 'pc', 'xbox', 'pc'])).toEqual(['pc', 'xbox', 'ios']);
  });

  it('drops unknown values', () => {
    expect(sortPlatforms(['stadia', 'switch'])).toEqual([]);
  });
});

describe('detectPlatformsFromText', () => {
  it('matches explicit product tokens across titles and descriptions', () => {
    expect(
      detectPlatformsFromText(
        'The game is coming to PC, PS5, and Nintendo Switch',
        'Also confirmed for Xbox Series X.',
      ),
    ).toEqual(['pc', 'playstation', 'xbox', 'nintendo']);
  });

  it('returns canonical order even when matches appear out of order', () => {
    expect(detectPlatformsFromText('iOS, Xbox, and PC')).toEqual(['pc', 'xbox', 'ios']);
  });

  it('does not match "pc" inside NPC or UPC', () => {
    expect(detectPlatformsFromText('NPC dialogue overhaul', 'UPC barcode scanning')).toEqual([]);
  });

  it('still matches plurals and hyphenated forms of pc', () => {
    expect(detectPlatformsFromText('PCs get a new patch')).toEqual(['pc']);
    expect(detectPlatformsFromText('PC-only release')).toEqual(['pc']);
  });

  it('does not tag generic verbs as Nintendo', () => {
    expect(detectPlatformsFromText('Switch to the new policy')).toEqual([]);
  });

  it('tags Switch when the text is clearly gaming coverage', () => {
    expect(detectPlatformsFromText('The console port of the game hits Switch')).toEqual([
      'nintendo',
    ]);
  });

  it('ignores corporate headlines that only name the parent company', () => {
    expect(detectPlatformsFromText('Sony reports Q3 earnings')).toEqual([]);
    expect(detectPlatformsFromText('Microsoft beats estimates')).toEqual([]);
    expect(detectPlatformsFromText('Apple TV+ unveils its slate')).toEqual([]);
    expect(detectPlatformsFromText('Google antitrust ruling explained')).toEqual([]);
  });

  it('still tags explicit product brands', () => {
    expect(detectPlatformsFromText('PlayStation 5 sales top records')).toEqual(['playstation']);
    expect(detectPlatformsFromText('Apple Arcade adds new titles')).toEqual(['ios']);
    expect(detectPlatformsFromText('Google Play drops its fee')).toEqual(['android']);
    expect(detectPlatformsFromText('DualSense refresh announced')).toEqual(['playstation']);
  });

  it('matches Arabic platform names', () => {
    expect(detectPlatformsFromText('نينتندو تعلن عن سويتش جديد')).toEqual(['nintendo']);
    expect(detectPlatformsFromText('بلايستيشن 5 يحطم الأرقام')).toEqual(['playstation']);
  });

  it('returns [] for missing or blank input', () => {
    expect(detectPlatformsFromText(undefined, undefined)).toEqual([]);
    expect(detectPlatformsFromText('   ', '\n')).toEqual([]);
  });
});

describe('normalizePlatform', () => {
  it('accepts canonical ids and common labels', () => {
    expect(normalizePlatform('PC')).toBe('pc');
    expect(normalizePlatform('PlayStation 5')).toBe('playstation');
    expect(normalizePlatform('Xbox Series X')).toBe('xbox');
    expect(normalizePlatform('Nintendo Switch')).toBe('nintendo');
    expect(normalizePlatform('Google Play')).toBe('android');
    expect(normalizePlatform('iPhone')).toBe('ios');
  });

  it('maps company names only for model output', () => {
    expect(normalizePlatform('Sony')).toBe('playstation');
    expect(normalizePlatform('Microsoft')).toBe('xbox');
    expect(normalizePlatform('Apple')).toBe('ios');
  });

  it('rejects unknown or non-string values', () => {
    expect(normalizePlatform('stadia')).toBeNull();
    expect(normalizePlatform('all')).toBeNull();
    expect(normalizePlatform('')).toBeNull();
    expect(normalizePlatform(42)).toBeNull();
    expect(normalizePlatform(null)).toBeNull();
  });
});

describe('parseAiPlatforms', () => {
  it('normalizes, dedupes, and sorts the model array', () => {
    expect(
      parseAiPlatforms(JSON.stringify({ platforms: ['Xbox', 'PS5', 'xbox', 'Switch'] })),
    ).toEqual(['playstation', 'xbox', 'nintendo']);
  });

  it('accepts company names from the model', () => {
    expect(parseAiPlatforms(JSON.stringify({ platforms: ['Sony'] }))).toEqual(['playstation']);
  });

  it('drops unknown ids', () => {
    expect(parseAiPlatforms(JSON.stringify({ platforms: ['pc', 'stadia'] }))).toEqual(['pc']);
  });

  it('returns [] for missing, invalid, or malformed payloads', () => {
    expect(parseAiPlatforms(JSON.stringify({ en: 'summary' }))).toEqual([]);
    expect(parseAiPlatforms(JSON.stringify({ platforms: 'pc' }))).toEqual([]);
    expect(parseAiPlatforms(JSON.stringify(['pc']))).toEqual([]);
    expect(parseAiPlatforms('not json')).toEqual([]);
    expect(parseAiPlatforms('')).toEqual([]);
  });
});

describe('resolveArticlePlatforms', () => {
  it('trusts a non-empty AI answer and never merges keywords', () => {
    expect(resolveArticlePlatforms(['xbox'], 'Sony and PlayStation news')).toEqual({
      platforms: ['xbox'],
      source: 'ai',
    });
  });

  it('falls back to keywords when the model returned nothing usable', () => {
    expect(resolveArticlePlatforms([], 'PS5 review roundup')).toEqual({
      platforms: ['playstation'],
      source: 'keyword',
    });
  });

  it('uses the caller-provided fallback source for backfills', () => {
    expect(resolveArticlePlatforms([], 'PS5 review roundup', undefined, 'backfill')).toEqual({
      platforms: ['playstation'],
      source: 'backfill',
    });
  });

  it('treats a full miss as general and matches every filter', () => {
    expect(resolveArticlePlatforms([], 'Sony reports Q3 earnings')).toEqual({
      platforms: [...ALL_PLATFORMS],
      source: 'default',
    });
  });
});
