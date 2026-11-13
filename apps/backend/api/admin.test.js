/** Pure admin-dashboard primitives and route-auth wiring tests. */
import { describe, expect, it, vi } from 'vitest';
import {
  buildBreakdown,
  buildSignupSeries,
  decodeCursor,
  encodeCursor,
  normalizeAdminSearch,
  parseLimit,
  registerAdminRoutes,
  resolveRange,
  sanitizeUserRecord,
  assertAdminRemovalAllowed,
  assertDisableAllowed,
  toMillis,
  AdminError,
} from './admin.js';

const DAY = 24 * 60 * 60 * 1000;

describe('admin search normalisation', () => {
  it('trims, strips @, lowercases and caps the term', () => {
    expect(normalizeAdminSearch('  @@Some_Player  ')).toBe('some_player');
    expect(normalizeAdminSearch('X'.repeat(200))).toHaveLength(80);
    expect(normalizeAdminSearch(undefined)).toBe('');
  });
});

describe('limit parsing', () => {
  it('falls back and clamps', () => {
    expect(parseLimit(undefined)).toBe(25);
    expect(parseLimit('0')).toBe(25);
    expect(parseLimit('10')).toBe(10);
    expect(parseLimit('1000')).toBe(50);
    expect(parseLimit('1000', 50, 100)).toBe(100);
  });
});

describe('range resolution', () => {
  it('maps known keys and defaults to 30 days', () => {
    const now = 1_000 * DAY;
    expect(resolveRange('7d', now)).toMatchObject({ range: '7d', days: 7, startMs: now - 7 * DAY });
    expect(resolveRange('90d', now).days).toBe(90);
    expect(resolveRange('nonsense', now).range).toBe('30d');
  });
});

describe('timestamps', () => {
  it('normalises Firestore timestamps, millis, dates and ISO strings', () => {
    expect(toMillis(1234)).toBe(1234);
    expect(toMillis(new Date(5000))).toBe(5000);
    expect(toMillis({ toMillis: () => 9000 })).toBe(9000);
    expect(toMillis('2024-01-01T00:00:00.000Z')).toBe(Date.parse('2024-01-01T00:00:00.000Z'));
    expect(toMillis(null)).toBeNull();
    expect(toMillis('not a date')).toBeNull();
  });
});

describe('cursor round-trip', () => {
  it('encodes and decodes opaque cursors', () => {
    const token = encodeCursor(1_700_000_000_000, 'abc');
    expect(decodeCursor(token)).toEqual({ createdAt: 1_700_000_000_000, id: 'abc' });
  });

  it('rejects invalid cursors instead of throwing', () => {
    expect(decodeCursor('not-base64')).toBeNull();
    expect(decodeCursor(encodeCursor(NaN, 'x'))).toBeNull();
    expect(decodeCursor(undefined)).toBeNull();
  });
});

describe('signup series', () => {
  it('buckets timestamps into consecutive days and ignores the window edges', () => {
    const start = Date.UTC(2024, 0, 1);
    const end = start + 3 * DAY;
    const series = buildSignupSeries(
      [start, start, start + DAY / 2, start + 2 * DAY, end + 1, start - 1],
      start,
      end,
    );
    expect(series.map((bucket) => bucket.count)).toEqual([3, 0, 1]);
    expect(series[0].date).toBe('2024-01-01');
  });
});

describe('breakdowns', () => {
  it('counts, sorts and labels empty values', () => {
    const result = buildBreakdown(['pc', 'pc', 'ps5', '', null, 'xbox', 'ps5', 'pc']);
    expect(result[0]).toEqual({ value: 'pc', count: 3 });
    expect(result.find((row) => row.value === 'unknown')).toEqual({
      value: 'unknown',
      count: 2,
    });
  });
});

describe('user sanitisation', () => {
  it('whitelists public fields and never leaks tokens', () => {
    const row = sanitizeUserRecord('uid-1', {
      displayName: 'Player',
      email: 'player@example.com',
      isAdmin: true,
      disabled: 'yes',
      fcmToken: 'secret-token',
      linkedAccountSecrets: { psn: 'secret' },
      createdAt: 1234,
    });

    expect(row).toMatchObject({
      uid: 'uid-1',
      displayName: 'Player',
      email: 'player@example.com',
      isAdmin: true,
      disabled: false,
      createdAt: 1234,
    });
    expect(row).not.toHaveProperty('fcmToken');
    expect(row).not.toHaveProperty('linkedAccountSecrets');
  });
});

describe('admin action guards', () => {
  it('blocks self-demotion and removing the last admin', () => {
    expect(() =>
      assertAdminRemovalAllowed({ actorUid: 'a', targetUid: 'a', adminCount: 2 }),
    ).toThrow(AdminError);
    expect(() =>
      assertAdminRemovalAllowed({ actorUid: 'a', targetUid: 'b', adminCount: 1 }),
    ).toThrow(AdminError);
    expect(() =>
      assertAdminRemovalAllowed({ actorUid: 'a', targetUid: 'b', adminCount: 2 }),
    ).not.toThrow();
  });

  it('blocks self-disable', () => {
    expect(() => assertDisableAllowed({ actorUid: 'a', targetUid: 'a' })).toThrow(AdminError);
    expect(() => assertDisableAllowed({ actorUid: 'a', targetUid: 'b' })).not.toThrow();
  });
});

describe('admin route registration', () => {
  it('puts auth middleware on every admin endpoint', () => {
    const routes = [];
    const app = {
      get: vi.fn((path, ...handlers) => routes.push({ method: 'get', path, handlers })),
      post: vi.fn((path, ...handlers) => routes.push({ method: 'post', path, handlers })),
    };
    const asyncRoute = (handler) => handler;
    registerAdminRoutes(app, { AppError: class extends Error {}, asyncRoute });

    expect(routes.map((route) => `${route.method} ${route.path}`)).toEqual([
      'get /admin/me',
      'get /admin/overview',
      'get /admin/users',
      'get /admin/users/:uid',
      'post /admin/users/:uid/admin',
      'post /admin/users/:uid/disabled',
      'get /admin/audit',
    ]);

    for (const route of routes) {
      expect(route.handlers).toHaveLength(2);
      expect(typeof route.handlers[0]).toBe('function');
      expect(typeof route.handlers[1]).toBe('function');
    }
  });
});
