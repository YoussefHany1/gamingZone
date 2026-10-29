/**
 * Pins the plain-JS mirror of `packages/core/src/social.ts`.
 *
 * The Vercel function folder is deployed standalone and cannot import the
 * workspace TS package, so the handle rules, the candidate generator and the
 * link projection are duplicated in `social.js`. These cases pin the plain-JS
 * mirror against `packages/core/src/social.ts`; the mobile suite pins the
 * Firestore → `PublicProfile` mapping (`profileMapper.test.ts`). If the mirrors
 * drift, this suite fails before a client does.
 */
import { Timestamp } from 'firebase-admin/firestore';
import { describe, expect, it } from 'vitest';
import {
  asMillis,
  handleCandidates,
  HANDLE_MAX_LENGTH,
  isProfileLinkPlatform,
  normalizeHandle,
  projectLink,
  slugifyHandleBase,
  validateHandle,
} from './social.js';

describe('normalizeHandle', () => {
  it('strips a leading @, trims, and lowercases', () => {
    expect(normalizeHandle('  @Some_Player  ')).toBe('some_player');
  });

  it('strips repeated @ prefixes', () => {
    expect(normalizeHandle('@@name')).toBe('name');
  });

  it('treats non-strings as empty', () => {
    expect(normalizeHandle(null)).toBe('');
    expect(normalizeHandle(undefined)).toBe('');
  });
});

describe('validateHandle', () => {
  it('accepts a canonical handle and returns the normalised form', () => {
    expect(validateHandle('@Good_Name')).toEqual({ ok: true, handle: 'good_name' });
  });

  it.each([
    ['', 'empty'],
    ['   ', 'empty'],
    ['@', 'empty'],
    ['ab', 'length'],
    ['a'.repeat(HANDLE_MAX_LENGTH + 1), 'length'],
    ['bad-name', 'charset'],
    ['bad name', 'charset'],
    ['ümlaut', 'charset'],
  ])('rejects %j as %s', (input, reason) => {
    expect(validateHandle(input)).toEqual({ ok: false, reason });
  });

  it('rejects reserved handles regardless of case', () => {
    expect(validateHandle('@Steam')).toEqual({ ok: false, reason: 'reserved' });
    expect(validateHandle('admin')).toEqual({ ok: false, reason: 'reserved' });
  });
});

describe('slugifyHandleBase', () => {
  it('folds accents and collapses separators', () => {
    expect(slugifyHandleBase('  Élite   Gamer!! ')).toBe('elite_gamer');
  });

  it('returns an empty string for non-Latin names', () => {
    expect(slugifyHandleBase('يوسف')).toBe('');
  });

  it('caps the base length and trims a trailing underscore', () => {
    expect(slugifyHandleBase('abcdefghijklmnop', 5)).toBe('abcde');
    expect(slugifyHandleBase('abcde fghij', 6)).toBe('abcde');
  });
});

describe('handleCandidates', () => {
  const uid = 'AbC123def456ghi789';

  it('is deterministic and unique', () => {
    const first = handleCandidates('Player One', uid);
    const second = handleCandidates('Player One', uid);

    expect(first).toEqual(second);
    expect(new Set(first).size).toBe(first.length);
  });

  it('only produces valid handles', () => {
    for (const candidate of handleCandidates('Player One', uid)) {
      expect(validateHandle(candidate).ok).toBe(true);
    }
  });

  it('falls back to `player` for non-Latin display names', () => {
    const [first] = handleCandidates('يوسف', uid);
    expect(first).toMatch(/^player_/);
  });

  it('never exceeds the handle length cap', () => {
    for (const candidate of handleCandidates('a'.repeat(50), uid)) {
      expect(candidate.length).toBeLessThanOrEqual(HANDLE_MAX_LENGTH);
    }
  });
});

describe('isProfileLinkPlatform', () => {
  it('accepts the four projected platforms', () => {
    for (const platform of ['steam', 'psn', 'xbox', 'discord']) {
      expect(isProfileLinkPlatform(platform)).toBe(true);
    }
  });

  it('rejects anything else', () => {
    expect(isProfileLinkPlatform('nintendo')).toBe(false);
    expect(isProfileLinkPlatform('')).toBe(false);
  });
});

describe('projectLink', () => {
  it('projects a linked Steam account as private by default', () => {
    const link = projectLink('steam', { status: 'active', steamId: ' 7656119 ' }, undefined);

    expect(link).toEqual({
      platform: 'steam',
      identifier: '7656119',
      visible: false,
      linkedAt: null,
    });
  });

  it('keeps an explicit visibility choice across re-links', () => {
    const previous = { platform: 'steam', identifier: 'old', visible: true, linkedAt: 100 };
    const link = projectLink('steam', { status: 'active', steamId: 'new' }, previous);

    expect(link).toMatchObject({ identifier: 'new', visible: true });
  });

  it('treats `unlinked` as not linked even when identifiers remain', () => {
    expect(projectLink('steam', { status: 'unlinked', steamId: '7656119' }, undefined)).toBeNull();
  });

  it('returns null when the identifier field is missing or blank', () => {
    expect(projectLink('steam', { status: 'active' }, undefined)).toBeNull();
    expect(projectLink('steam', { status: 'active', steamId: '   ' }, undefined)).toBeNull();
  });

  it('uses the right identifier field per platform', () => {
    expect(
      projectLink('psn', { status: 'active', onlineId: 'Player' }, undefined)?.identifier,
    ).toBe('Player');
    expect(projectLink('xbox', { status: 'active', gamertag: 'Tag' }, undefined)?.identifier).toBe(
      'Tag',
    );
  });

  it('falls back through the Discord identifier fields in order', () => {
    const data = { status: 'active', userId: '1', id: '2', username: '3' };
    expect(projectLink('discord', data, undefined)?.identifier).toBe('1');
    expect(projectLink('discord', { status: 'active', username: '3' }, undefined)?.identifier).toBe(
      '3',
    );
  });

  it('carries linkedAt through as millis', () => {
    const linkedAt = Timestamp.fromMillis(1_700_000_000_000);
    const link = projectLink('xbox', { status: 'active', gamertag: 'Tag', linkedAt }, undefined);

    expect(link?.linkedAt).toBe(1_700_000_000_000);
  });

  it('adopts the previous linkedAt when the source has none', () => {
    const previous = { platform: 'xbox', identifier: 'Tag', visible: false, linkedAt: 42 };
    expect(projectLink('xbox', { status: 'active', gamertag: 'Tag' }, previous)?.linkedAt).toBe(42);
  });
});

describe('asMillis', () => {
  it('reads Timestamps, finite numbers, and rejects everything else', () => {
    expect(asMillis(Timestamp.fromMillis(123))).toBe(123);
    expect(asMillis({ toMillis: () => 234 })).toBe(234);
    expect(asMillis(456)).toBe(456);
    expect(asMillis('789')).toBeNull();
    expect(asMillis(Number.NaN)).toBeNull();
    expect(asMillis(undefined)).toBeNull();
  });
});
