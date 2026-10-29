/** Pure Phase 2 friend primitives and route-auth wiring tests. */
import { describe, expect, it, vi } from 'vitest';
import {
  blockedPairId,
  friendRequestId,
  friendshipId,
  normalizeProfileSearch,
  PROFILE_SEARCH_LIMIT,
  PROFILE_SEARCH_MIN_LENGTH,
  registerFriendRoutes,
  sortPair,
} from './friends.js';

describe('friend pair ids', () => {
  it('uses one sorted id for symmetric relationships', () => {
    expect(sortPair('z-user', 'a-user')).toEqual(['a-user', 'z-user']);
    expect(friendshipId('z-user', 'a-user')).toBe('a-user_z-user');
    expect(blockedPairId('a-user', 'z-user')).toBe('a-user_z-user');
  });

  it('keeps requests directional', () => {
    expect(friendRequestId('a-user', 'z-user')).toBe('a-user_z-user');
    expect(friendRequestId('z-user', 'a-user')).toBe('z-user_a-user');
    expect(friendRequestId('a-user', 'z-user')).not.toBe(friendRequestId('z-user', 'a-user'));
  });
});

describe('profile search normalisation', () => {
  it('trims, removes @ prefixes, lowercases and caps input', () => {
    expect(normalizeProfileSearch('  @@Some_Player  ')).toBe('some_player');
    expect(normalizeProfileSearch('X'.repeat(100))).toHaveLength(30);
    expect(normalizeProfileSearch(null)).toBe('');
  });

  it('publishes the search contract', () => {
    expect(PROFILE_SEARCH_MIN_LENGTH).toBe(2);
    expect(PROFILE_SEARCH_LIMIT).toBe(20);
  });
});

describe('friend route registration', () => {
  it('adds auth middleware to every friend endpoint', () => {
    const routes = [];
    const app = {
      post: vi.fn((path, ...handlers) => routes.push({ method: 'post', path, handlers })),
      get: vi.fn((path, ...handlers) => routes.push({ method: 'get', path, handlers })),
    };
    const asyncRoute = (handler) => handler;
    registerFriendRoutes(app, { AppError: class extends Error {}, asyncRoute });

    expect(routes).toHaveLength(8);
    for (const route of routes) {
      expect(route.handlers).toHaveLength(2);
      expect(typeof route.handlers[0]).toBe('function');
      expect(typeof route.handlers[1]).toBe('function');
    }
  });
});
