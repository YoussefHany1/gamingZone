/**
 * Pure (no I/O, no env) pieces of per-article AI summaries. Split out from
 * `articleSummary.service.ts` so the prompt/parse/validation logic can be unit
 * tested without booting the Appwrite client or validating environment vars.
 *
 * NOTE: `LANGUAGE_TO_ATTRIBUTE` is the write-side source of truth and mirrors
 * `getSummaryKey` in `packages/utils/src/index.ts` (read side, web + mobile).
 * Keep the two in sync — `articleSummary.test.ts` pins the attribute names.
 */

import { Query } from 'node-appwrite';

import type { AiModel } from '../../lib/ai.shared';

/** Every language the app's UI supports (`article` content is still only ar/en). */
const SUMMARY_LANGUAGES = ['en', 'ar', 'es', 'fr', 'hi', 'pt-BR', 'pt-PT'] as const;
type SummaryLanguage = (typeof SUMMARY_LANGUAGES)[number];

type SummaryMap = Partial<Record<SummaryLanguage, string>>;

/** Gemini response-schema keys — kept hyphen-free for safe structured output. */
const LANGUAGE_TO_JSON_KEY: Record<SummaryLanguage, string> = {
  en: 'en',
  ar: 'ar',
  es: 'es',
  fr: 'fr',
  hi: 'hi',
  'pt-BR': 'pt_br',
  'pt-PT': 'pt_pt',
};

const JSON_KEY_TO_LANGUAGE: Record<string, SummaryLanguage> = Object.fromEntries(
  SUMMARY_LANGUAGES.map((language) => [LANGUAGE_TO_JSON_KEY[language], language]),
);

/** Appwrite `articles` attribute per language (lowercase, no hyphens). */
const LANGUAGE_TO_ATTRIBUTE: Record<SummaryLanguage, string> = {
  en: 'summary_en',
  ar: 'summary_ar',
  es: 'summary_es',
  fr: 'summary_fr',
  hi: 'summary_hi',
  'pt-BR': 'summary_pt_br',
  'pt-PT': 'summary_pt_pt',
};

/**
 * Validation caps. Arabic and Hindi pack more meaning into fewer visible
 * characters, so a genuine "3 line" sentence routinely runs longer there.
 */
const PER_LANGUAGE_MAX_CHARS: Record<SummaryLanguage, number> = {
  en: 280,
  ar: 380,
  es: 280,
  fr: 280,
  hi: 380,
  'pt-BR': 280,
  'pt-PT': 280,
};

/**
 * Per-article summaries are high-volume (one call per article), so the chain
 * deliberately starts at the cheapest Gemini model and only touches the
 * pricier `gemini-2.5-flash` when flash-lite fails — preserving the historic
 * cost profile instead of inheriting the shared default chain's ordering.
 * The Groq and Cerebras models are always last (different providers, true last
 * resorts), each tried best-first.
 */
function articleSummaryChain(groqModels: string[], cerebrasModels: string[]): AiModel[] {
  return [
    { provider: 'gemini', model: 'gemini-3.1-flash-lite' },
    { provider: 'gemini', model: 'gemini-2.5-flash' },
    ...groqModels.map((model) => ({ provider: 'groq' as const, model })),
    ...cerebrasModels.map((model) => ({ provider: 'cerebras' as const, model })),
  ];
}

/** Attempts per article across backfill runs before it is marked failed. */
const MAX_ATTEMPTS = 3;
const MAX_DESCRIPTION_CHARS = 1_500;

// Backfill sizing — bounded so a slow Gemini run stays well inside the
// Appwrite function's 900s timeout (30 articles / concurrency 3 ≈ 450s worst
// case, on top of which the wall-clock deadline is a hard stop). Pacing adds a
// floor of 30 / BACKFILL_MAX_ARTICLES_PER_MINUTE = 150s, which is below the
// worst case above, so the effective budget is unchanged.
const BACKFILL_NEWEST = 20;
const BACKFILL_OLDEST = 10;
const BACKFILL_CONCURRENCY = 3;
const MAX_BACKFILL_MS = 600_000;

/**
 * Gemini meters requests per minute (one request per article), so a large
 * pending queue can trip a 429 even when every single request succeeds. The
 * backfill paces itself against this ceiling instead — see `pacingDelayMs`.
 *
 * The bottom of the 12–14/min band is deliberate: batches are dispatched
 * concurrently (`BACKFILL_CONCURRENCY`), and 12/min is the highest ceiling whose
 * batch interval (15s for 3 articles) still keeps *every* sliding 60s window at
 * or below the ceiling. Aiming higher lets a window catch an extra burst.
 */
const BACKFILL_MAX_ARTICLES_PER_MINUTE = 12;

interface SummarizableArticle {
  $id: string;
  title?: string;
  description?: string;
  summaries_attempts?: number;
}

/** Collapses HTML/whitespace so the prompt stays compact and plain. */
function toPromptText(value: string | undefined): string {
  if (!value) return '';
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_DESCRIPTION_CHARS);
}

function buildPrompt(article: SummarizableArticle): string {
  const title = (article.title ?? '').trim();
  const body = toPromptText(article.description);

  return `You are a senior gaming news editor writing a very short summary of the article below for a gaming audience.

RULES:
1. Return a JSON object with the string fields en, ar, es, fr, hi, pt_br, pt_pt and the string array platforms.
2. Each summary must be a single short paragraph of AT MOST 3 lines (~200-280 characters; Arabic and Hindi may use up to ~380).
3. Plain text only — no markdown, no headings, no bullet points, no surrounding quotes.
4. Write natively in each language (convey the meaning, do not translate word-for-word). Arabic must be clear Modern Standard Arabic (فصحى); Brazilian and European Portuguese must be distinct and natural.
5. Cover only the most important facts (who / what / why it matters).
6. If the text is unclear or very short, still produce your best short summary. Never leave a field empty.
7. platforms must list every platform the article is about, using ONLY these ids: pc, playstation, xbox, nintendo, android, ios. A multi-platform release lists several ids; a platform-exclusive story lists one. For general gaming-industry news that is not tied to a specific platform (earnings, studio layoffs, awards, events, legal news), return ALL SIX ids. Never invent ids, never use "all", and never return an empty array.

Article title: ${title}
Article text: ${body || title}`;
}

/** Removes a matching quote/backtick wrapper (e.g. `"summary"`), if present. */
function stripWrapperQuotes(text: string): string {
  const first = text[0];
  const last = text[text.length - 1];
  if (first && last && first === last && /["'`]/.test(first)) {
    return text.slice(1, -1).trim();
  }
  return text;
}

/** Trims a raw model string down to a clean, single-paragraph summary. */
function cleanSummary(value: string, language: SummaryLanguage): string {
  let text = value
    .replace(/```/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[#*\-•>]+\s*/, '')
    .trim();

  text = stripWrapperQuotes(text);

  const cap = PER_LANGUAGE_MAX_CHARS[language];
  if (text.length > cap) {
    const clipped = text.slice(0, cap);
    const lastSpace = clipped.lastIndexOf(' ');
    text = (lastSpace > cap * 0.6 ? clipped.slice(0, lastSpace) : clipped).trim();
  }

  return text;
}

/**
 * Parses the model JSON defensively: a single malformed/missing language never
 * discards the others. Throws only when the payload is not parseable JSON.
 */
function parseSummaries(rawText: string): SummaryMap {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error(`Failed to parse AI JSON: ${rawText.substring(0, 50)}`);
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('AI JSON was not an object.');
  }

  const record = parsed as Record<string, unknown>;
  const summaries: SummaryMap = {};

  for (const [jsonKey, language] of Object.entries(JSON_KEY_TO_LANGUAGE)) {
    const value = record[jsonKey];
    if (typeof value !== 'string') continue;
    const cleaned = cleanSummary(value, language);
    if (cleaned) summaries[language] = cleaned;
  }

  return summaries;
}

/**
 * How long to wait after a batch of `batchSize` articles that took `elapsedMs`
 * so the long-run rate stays at or below `maxPerMinute`. Returns `0` when the
 * batch was already slower than the target rate, so a slow model is never
 * slowed further.
 */
function pacingDelayMs(batchSize: number, elapsedMs: number, maxPerMinute: number): number {
  if (!Number.isFinite(batchSize) || !Number.isFinite(maxPerMinute)) return 0;
  if (batchSize <= 0 || maxPerMinute <= 0) return 0;

  const intervalMs = (batchSize / maxPerMinute) * 60_000;
  const spentMs = Number.isFinite(elapsedMs) && elapsedMs > 0 ? elapsedMs : 0;
  // `ceil`, not `round`: rounding the wait down would nudge the rate back over
  // the ceiling this function exists to respect.
  return Math.max(0, Math.ceil(intervalMs - spentMs));
}

/**
 * Coerces an optional queue-size override into a usable non-negative integer.
 * `undefined`, non-finite (`NaN`/`Infinity`) and negative values fall back to
 * `fallback`; `0` is preserved as the explicit "skip this queue" signal;
 * positives are floored. Guards against junk reaching `Query.limit(...)`, which
 * Appwrite rejects outside `1..9_223_372_036_854_775_807`.
 */
function sanitizeQueueLimit(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  const floored = Math.floor(value);
  return floored < 0 ? fallback : floored;
}

/**
 * Describes one pending-articles queue query, or `null` when the queue must be
 * skipped entirely. Appwrite requires `Query.limit` to be >= 1, so a zero /
 * non-integer limit here means "don't run this query" rather than `limit(0)`.
 */
function buildPendingQueueQuery(
  order: 'desc' | 'asc',
  limit: number,
): { order: 'desc' | 'asc'; limit: number } | null {
  if (!Number.isInteger(limit) || limit < 1) return null;
  return { order, limit };
}

/**
 * Reads the `--limit <n>` / `--limit=<n>` CLI override (or the
 * `SUMMARY_BACKFILL_LIMIT` env fallback). Always returns a positive integer or
 * `undefined`: `NaN`, `Infinity`, `0`, negatives and a missing value are
 * rejected so they can never be forwarded to `Query.limit`.
 */
function parseBackfillLimit(argv: string[], envValue?: string): number | undefined {
  const toPositiveInt = (raw: string | undefined): number | undefined => {
    if (raw === undefined) return undefined;
    const value = Number(raw);
    if (!Number.isFinite(value)) return undefined;
    const floored = Math.floor(value);
    return floored >= 1 ? floored : undefined;
  };

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--limit') return toPositiveInt(argv[i + 1]);
    if (argv[i].startsWith('--limit=')) return toPositiveInt(argv[i].slice('--limit='.length));
  }

  return toPositiveInt(envValue);
}

/**
 * Appwrite query filters that select articles still awaiting a summary:
 * `summaries_at` is unset AND the article has not permanently failed.
 *
 * The failure check accepts BOTH `false` and unset (`null`). Appwrite does not
 * backfill an attribute's default onto documents that already existed when the
 * attribute was created, so on a pre-existing collection `summaries_failed`
 * reads as `null` rather than `false` — an `equal(false)`-only filter silently
 * skips the entire backlog. Documents created after the attribute exists do
 * receive the `false` default and match the first branch.
 *
 * Returned as strings (what `Query.*` produces) so both the backfill service and
 * the read-only status job can share one source of truth and unit test it.
 */
function pendingSummaryFilters(): string[] {
  return [
    Query.isNull('summaries_at'),
    Query.or([Query.equal('summaries_failed', false), Query.isNull('summaries_failed')]),
  ];
}

export {
  SUMMARY_LANGUAGES,
  LANGUAGE_TO_JSON_KEY,
  JSON_KEY_TO_LANGUAGE,
  LANGUAGE_TO_ATTRIBUTE,
  PER_LANGUAGE_MAX_CHARS,
  articleSummaryChain,
  MAX_ATTEMPTS,
  MAX_DESCRIPTION_CHARS,
  BACKFILL_NEWEST,
  BACKFILL_OLDEST,
  BACKFILL_CONCURRENCY,
  BACKFILL_MAX_ARTICLES_PER_MINUTE,
  MAX_BACKFILL_MS,
  pacingDelayMs,
  toPromptText,
  buildPrompt,
  cleanSummary,
  parseSummaries,
  sanitizeQueueLimit,
  buildPendingQueueQuery,
  parseBackfillLimit,
  pendingSummaryFilters,
};
export type { SummaryLanguage, SummaryMap, SummarizableArticle };
