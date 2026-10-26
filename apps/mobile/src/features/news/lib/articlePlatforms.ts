import { ARTICLE_PLATFORMS } from "@gaming-zone/core";
import type { ArticlePlatform } from "@gaming-zone/core";

/** Feed filter value: one platform, or everything. */
export type NewsPlatformFilter = ArticlePlatform | "all";

/** True when `value` is one of the six canonical ids. */
export function isArticlePlatform(value: unknown): value is ArticlePlatform {
  return (
    typeof value === "string" &&
    (ARTICLE_PLATFORMS as readonly string[]).includes(value.trim().toLowerCase())
  );
}

/**
 * Normalizes a stored `platforms` value into canonical order, dropping unknown
 * ids and duplicates. Missing/legacy documents yield `[]`.
 */
export function articlePlatformsOf(article: {
  platforms?: unknown;
} | null | undefined): ArticlePlatform[] {
  const raw = article?.platforms;
  if (!Array.isArray(raw)) return [];

  const found = new Set<ArticlePlatform>();
  for (const value of raw) {
    if (!isArticlePlatform(value)) continue;
    found.add(value.trim().toLowerCase() as ArticlePlatform);
  }

  return ARTICLE_PLATFORMS.filter((platform) => found.has(platform));
}

/**
 * A general/industry article is tagged with every platform, so it matches every
 * filter and gets no badge (a badge row showing all six would be noise).
 */
export function isGeneralArticle(platforms: readonly ArticlePlatform[]): boolean {
  return platforms.length >= ARTICLE_PLATFORMS.length;
}

/** Platforms worth showing as badges — empty for general/unclassified articles. */
export function badgePlatformsOf(article: {
  platforms?: unknown;
} | null | undefined): ArticlePlatform[] {
  const platforms = articlePlatformsOf(article);
  return isGeneralArticle(platforms) ? [] : platforms;
}
