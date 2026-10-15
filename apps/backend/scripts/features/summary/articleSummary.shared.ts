/**
 * Pure (no I/O, no env) pieces of per-article AI summaries. Split out from
 * `articleSummary.service.ts` so the prompt/parse/validation logic can be unit
 * tested without booting the Appwrite client or validating environment vars.
 *
 * NOTE: `LANGUAGE_TO_ATTRIBUTE` is the write-side source of truth and mirrors
 * `getSummaryKey` in `packages/utils/src/index.ts` (read side, web + mobile).
 * Keep the two in sync — `articleSummary.test.ts` pins the attribute names.
 */

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

const MODEL = 'gemini-2.5-flash';
const GEMINI_TIMEOUT_MS = 25_000;
const MAX_GEMINI_RETRIES = 3;
/** Attempts per article across backfill runs before it is marked failed. */
const MAX_ATTEMPTS = 3;
const MAX_DESCRIPTION_CHARS = 1_500;

// Backfill sizing — bounded so a slow Gemini run stays well inside the
// Appwrite function's 900s timeout (30 articles / concurrency 3 ≈ 450s worst
// case, on top of which the wall-clock deadline is a hard stop).
const BACKFILL_NEWEST = 20;
const BACKFILL_OLDEST = 10;
const BACKFILL_CONCURRENCY = 3;
const MAX_BACKFILL_MS = 600_000;

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
1. Return a JSON object with exactly these string fields: en, ar, es, fr, hi, pt_br, pt_pt.
2. Each summary must be a single short paragraph of AT MOST 3 lines (~200-280 characters; Arabic and Hindi may use up to ~380).
3. Plain text only — no markdown, no headings, no bullet points, no surrounding quotes.
4. Write natively in each language (convey the meaning, do not translate word-for-word). Arabic must be clear Modern Standard Arabic (فصحى); Brazilian and European Portuguese must be distinct and natural.
5. Cover only the most important facts (who / what / why it matters).
6. If the text is unclear or very short, still produce your best short summary. Never leave a field empty.

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

export {
  SUMMARY_LANGUAGES,
  LANGUAGE_TO_JSON_KEY,
  JSON_KEY_TO_LANGUAGE,
  LANGUAGE_TO_ATTRIBUTE,
  PER_LANGUAGE_MAX_CHARS,
  MODEL,
  GEMINI_TIMEOUT_MS,
  MAX_GEMINI_RETRIES,
  MAX_ATTEMPTS,
  MAX_DESCRIPTION_CHARS,
  BACKFILL_NEWEST,
  BACKFILL_OLDEST,
  BACKFILL_CONCURRENCY,
  MAX_BACKFILL_MS,
  toPromptText,
  buildPrompt,
  cleanSummary,
  parseSummaries,
};
export type { SummaryLanguage, SummaryMap, SummarizableArticle };
