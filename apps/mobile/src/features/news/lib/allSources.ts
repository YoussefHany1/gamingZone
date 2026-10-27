/**
 * Synthetic source names for the "All sources" entries in the source picker.
 *
 * These are not real RSS sources — they select a combined feed with an optional
 * language filter. `__all__` is kept for backwards compatibility with older
 * cached selections; the language-suffixed variants are what the picker ships
 * today. Use {@link isAllSourcesName} instead of `name.startsWith("__all__")`:
 * the suffixed names start with `"__all_"`, not `"__all__"`.
 */
export const ALL_SOURCES_NAME = "__all__";
export const ALL_LANGUAGES_NAME = "__all_all__";
export const ARABIC_SOURCES_NAME = "__all_ar__";
export const ENGLISH_SOURCES_NAME = "__all_en__";

const ALL_SOURCES_NAMES: ReadonlySet<string> = new Set([
  ALL_SOURCES_NAME,
  ALL_LANGUAGES_NAME,
  ARABIC_SOURCES_NAME,
  ENGLISH_SOURCES_NAME,
]);

/** True when the source name refers to one of the synthetic all-sources entries. */
export function isAllSourcesName(name?: string | null): boolean {
  return name != null && ALL_SOURCES_NAMES.has(name);
}
