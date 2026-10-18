/**
 * The MMKV / `useCachedData` key holding one game's details payload.
 *
 * Two places have to agree on it: `useGameData`, which writes the entry, and
 * `useGameContentReady`, which uses its presence to decide whether the screen
 * can skip its skeleton. Changing the format in one place only would silently
 * disable the instant-render path on cached visits.
 */
export function gameDetailsCacheKey(gameId: number | string): string {
  return `GAME_DETAILS_CACHE_${gameId}`;
}
