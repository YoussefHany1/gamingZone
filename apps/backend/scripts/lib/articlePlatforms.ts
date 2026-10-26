/**
 * Platform classification for news articles.
 *
 * Two different jobs live here, and they deliberately use different token
 * tables:
 *
 * - `parseAiPlatforms` normalizes the constrained answer a model gives when
 *   asked "which platforms does this article cover?". Company names are safe
 *   there (`sony` → playstation), because the model already decided the article
 *   is about a platform.
 * - `detectPlatformsFromText` is the deterministic fallback that scans raw RSS
 *   title/description. It only uses explicit product tokens: a lone "Sony
 *   reports Q3 earnings" is corporate news, not a PlayStation release, and must
 *   fall through to "general" (all platforms) instead of being tagged
 *   playstation-only.
 *
 * Keep `ARTICLE_PLATFORMS` in sync with `packages/core/src/index.ts`; the unit
 * test pins the ids so the two can never drift silently.
 */

/** Canonical platform ids, also the display/sort order. */
export const ARTICLE_PLATFORMS = [
  'pc',
  'playstation',
  'xbox',
  'nintendo',
  'android',
  'ios',
] as const;

export type ArticlePlatform = (typeof ARTICLE_PLATFORMS)[number];

/**
 * Where a document's `platforms` value came from:
 * - `ai` — model classification (authoritative)
 * - `keyword` — deterministic fallback after the model returned nothing usable
 * - `backfill` — deterministic pass over a pre-existing article
 * - `default` — nothing matched, so the article is treated as general
 */
export type PlatformSource = 'ai' | 'keyword' | 'backfill' | 'default';

/** Every platform — what a general / non-platform-specific article is tagged with. */
export const ALL_PLATFORMS: readonly ArticlePlatform[] = ARTICLE_PLATFORMS;

/**
 * Explicit product tokens, safe to match in raw article text. Company names are
 * intentionally absent (see the file header).
 */
const TEXT_TOKENS: Record<ArticlePlatform, readonly string[]> = {
  pc: [
    'pc',
    'pcs',
    'windows',
    'steam',
    'steam deck',
    'steamos',
    'epic games store',
    'epic games',
    'gog',
  ],
  playstation: [
    'playstation',
    'ps5',
    'ps4',
    'ps3',
    'psn',
    'psvr',
    'psvr2',
    'dualsense',
    'ps plus',
    'بلايستيشن',
    'بلاي ستيشن',
  ],
  xbox: ['xbox', 'series x', 'series s', 'game pass', 'إكس بوكس', 'اكس بوكس'],
  nintendo: ['nintendo', 'nintendo switch', 'switch 2', 'joy-con', 'nsw', 'نينتندو', 'سويتش'],
  android: ['android', 'google play', 'أندرويد', 'اندرويد'],
  ios: ['ios', 'iphone', 'ipad', 'app store', 'apple arcade'],
};

/**
 * Tokens that are real platform words but also common English words. They only
 * count when the surrounding text still reads as gaming coverage.
 */
const GAMING_CONTEXT =
  /\b(?:nintendo|console|consoles|gaming|game|games|handheld|port|ports|remaster|remake|launch|launches|release|releases|joy-con|controller|players?)\b/i;

const AMBIGUOUS_TEXT_TOKENS: ReadonlyArray<{
  token: string;
  platform: ArticlePlatform;
  requires: RegExp;
}> = [{ token: 'switch', platform: 'nintendo', requires: GAMING_CONTEXT }];

/**
 * Company / storefront aliases, only used to normalize a model's answer. The
 * model is answering "which platforms does this article cover?", so mapping
 * `sony` or `microsoft` here is safe.
 */
const AI_ALIASES: ReadonlyArray<{ alias: string; platform: ArticlePlatform }> = [
  ...flattenTokens([
    ...Object.entries(TEXT_TOKENS).map(
      ([platform, tokens]) => [platform as ArticlePlatform, tokens] as const,
    ),
  ]),
  { alias: 'pc gaming', platform: 'pc' },
  { alias: 'desktop', platform: 'pc' },
  { alias: 'computer', platform: 'pc' },
  { alias: 'valve', platform: 'pc' },
  { alias: 'sony', platform: 'playstation' },
  { alias: 'playstation 5', platform: 'playstation' },
  { alias: 'playstation 4', platform: 'playstation' },
  { alias: 'microsoft', platform: 'xbox' },
  { alias: 'xbox series', platform: 'xbox' },
  { alias: 'xbox one', platform: 'xbox' },
  { alias: 'nintendo switch 2', platform: 'nintendo' },
  { alias: 'switch', platform: 'nintendo' },
  { alias: 'google', platform: 'android' },
  { alias: 'apple', platform: 'ios' },
  { alias: 'iphone os', platform: 'ios' },
];

/** Flattens the per-platform token table into alias entries. */
function flattenTokens(
  groups: ReadonlyArray<readonly [ArticlePlatform, readonly string[]]>,
): Array<{ alias: string; platform: ArticlePlatform }> {
  const entries: Array<{ alias: string; platform: ArticlePlatform }> = [];
  for (const [platform, tokens] of groups) {
    for (const token of tokens) entries.push({ alias: token, platform });
  }
  return entries;
}

/** Longest scan we subject to regex matching (descriptions can be huge). */
const MAX_SCAN_CHARS = 4_000;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Unicode-aware word boundary. `\b` is not enough: it treats `_` as a word
 * character and is unreliable next to non-Latin scripts, which is exactly how
 * "UPC"/"NPC" would leak a `pc` match.
 */
function tokenPattern(token: string): RegExp {
  const body = escapeRegExp(token.trim().toLowerCase()).replace(/\s+/g, '\\s+');
  return new RegExp(`(?<![\\p{L}\\p{N}])${body}(?![\\p{L}\\p{N}])`, 'iu');
}

/** Compiled once — the backfill scans thousands of documents. */
const COMPILED_TEXT_TOKENS: ReadonlyArray<{ platform: ArticlePlatform; pattern: RegExp }> =
  ARTICLE_PLATFORMS.flatMap((platform) =>
    TEXT_TOKENS[platform].map((token) => ({ platform, pattern: tokenPattern(token) })),
  );

const COMPILED_AMBIGUOUS_TOKENS = AMBIGUOUS_TEXT_TOKENS.map((rule) => ({
  ...rule,
  pattern: tokenPattern(rule.token),
}));

const COMPILED_AI_ALIASES: ReadonlyArray<{ platform: ArticlePlatform; pattern: RegExp }> =
  AI_ALIASES.map(({ alias, platform }) => ({ platform, pattern: tokenPattern(alias) }));

/** Dedupes and returns platforms in canonical `ARTICLE_PLATFORMS` order. */
export function sortPlatforms(values: Iterable<string>): ArticlePlatform[] {
  const found = new Set<ArticlePlatform>();
  for (const value of values) {
    const match = ARTICLE_PLATFORMS.find((platform) => platform === value.trim().toLowerCase());
    if (match) found.add(match);
  }
  return ARTICLE_PLATFORMS.filter((platform) => found.has(platform));
}

/**
 * Maps one free-form platform label (from the model) to a canonical id.
 * Returns `null` when the label does not name a known platform.
 */
export function normalizePlatform(value: unknown): ArticlePlatform | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;

  const exact = ARTICLE_PLATFORMS.find((platform) => platform === normalized);
  if (exact) return exact;

  for (const { platform, pattern } of COMPILED_AI_ALIASES) {
    if (pattern.test(normalized)) return platform;
  }

  return null;
}

/**
 * Reads the `platforms` array out of the same JSON payload that carries the
 * summaries. Returns `[]` for a missing/invalid field — the caller then falls
 * back to keyword extraction.
 */
export function parseAiPlatforms(rawText: string): ArticlePlatform[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return [];
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return [];

  const value = (parsed as Record<string, unknown>).platforms;
  if (!Array.isArray(value)) return [];

  const found = new Set<ArticlePlatform>();
  for (const item of value) {
    const platform = normalizePlatform(item);
    if (platform) found.add(platform);
  }

  return ARTICLE_PLATFORMS.filter((platform) => found.has(platform));
}

/**
 * Deterministic fallback: scans a headline/description for explicit platform
 * tokens. Returns `[]` when the text looks like general coverage.
 */
export function detectPlatformsFromText(
  title?: string | null,
  description?: string | null,
): ArticlePlatform[] {
  const text = `${title ?? ''}\n${description ?? ''}`.slice(0, MAX_SCAN_CHARS);
  if (!text.trim()) return [];

  const found = new Set<ArticlePlatform>();

  for (const { platform, pattern } of COMPILED_TEXT_TOKENS) {
    if (pattern.test(text)) found.add(platform);
  }

  for (const { platform, pattern, requires } of COMPILED_AMBIGUOUS_TOKENS) {
    if (pattern.test(text) && requires.test(text)) found.add(platform);
  }

  return ARTICLE_PLATFORMS.filter((platform) => found.has(platform));
}

/**
 * Resolves the platforms to store for an article: the model's answer wins when
 * it produced one; otherwise the deterministic scan; otherwise the article is
 * general and matches every platform filter.
 */
export function resolveArticlePlatforms(
  aiPlatforms: readonly ArticlePlatform[],
  title?: string | null,
  description?: string | null,
  fallbackSource: PlatformSource = 'keyword',
): { platforms: ArticlePlatform[]; source: PlatformSource } {
  if (aiPlatforms.length > 0) {
    return { platforms: sortPlatforms(aiPlatforms), source: 'ai' };
  }

  const keywords = detectPlatformsFromText(title, description);
  if (keywords.length > 0) {
    return { platforms: keywords, source: fallbackSource };
  }

  return { platforms: [...ALL_PLATFORMS], source: 'default' };
}
