import useCachedData from "@/src/hooks/useCachedData";

export type SectionFeedResult<T> = {
  /**
   * The cached payload, null when nothing has been cached yet.
   *
   * Typed as an array, but the cache reader casts blindly — a payload
   * persisted by an older app version can be any shape. Sections defend with
   * `Array.isArray` exactly where the legacy implementations did (that defence
   * is not uniform across sections and was ported as-is, not unified).
   */
  games: T[] | null;
  /** True while a fetch revalidation is in flight. */
  isLoading: boolean;
  error: Error | null;
};

/**
 * The games feed sections' shared data hook.
 *
 * Every registry section reads one cache key through one fetch call with
 * identical policy. The first two migrated sections (`recently_released`,
 * `popular`) cloned this hook byte-for-byte except for the key and fetch;
 * the third matching instance proved the shape stable, so the shared core
 * lives here. The payload type is generic because the sections are split
 * between IGDB `Game[]` rails and the Appwrite-backed `FreeGameItem[]` rail.
 * Sections that genuinely diverge can still own their data policy instead
 * of forcing this hook to bend.
 */
export function useSectionFeed<T>(
  storageKey: string,
  fetchGames: () => Promise<T[]>,
  /**
   * Re-fetch when any of these change — forwarded verbatim to
   * `useCachedData`'s identically-named dependency parameter. The feed
   * rails leave it empty; the per-platform trending rail forwards its
   * `platform` here.
   */
  dependencies: unknown[] = [],
): SectionFeedResult<T> {
  const { data, isLoading, error } = useCachedData<T[]>(
    storageKey,
    fetchGames,
    dependencies,
  );

  return { games: data, isLoading, error };
}
