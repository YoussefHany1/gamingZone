import striptags from 'striptags';
import he from 'he';

import { getTextValue } from './helpers';

/**
 * Deterministic text cleanup for feed/article descriptions.
 *
 * Kept separate from `normalize.ts` so the HTML-to-text converter and the
 * boilerplate rules can be unit tested without booting a feed parser. No new
 * dependencies: `striptags` already ships with the project.
 */

const ZERO_WIDTH_CHARS = /[\u200B-\u200D\u2060\uFEFF]/g;
const SOFT_HYPHENS = /\u00AD/g;
const UNICODE_SPACES = /[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g;

const BLOCK_TAG =
  'p|div|h[1-6]|li|tr|th|td|ul|ol|blockquote|section|article|header|footer|figure|figcaption|pre|table|thead|tbody|aside|main|nav|address|details|summary';
const BLOCK_CLOSE = new RegExp(`</(?:${BLOCK_TAG})\\s*>`, 'gi');
const BLOCK_OPEN = new RegExp(`<(?:${BLOCK_TAG})(?:\\s[^>]*)?>`, 'gi');
const NOISE_BLOCK = /<(script|style|noscript|iframe|svg)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
const NOISE_SELF_CLOSING = /<(?:script|style|noscript|iframe)\b[^>]*\/?>/gi;

/** Normalizes line endings, exotic spaces, and invisible characters. */
export function normalizeText(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(ZERO_WIDTH_CHARS, '')
    .replace(SOFT_HYPHENS, '')
    .replace(UNICODE_SPACES, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#160;/gi, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Converts HTML to readable text while preserving block boundaries. Block
 * tags become paragraph breaks and `<br>` becomes a line break, so sentences
 * from adjacent `<p>` elements never run together.
 */
export function stripHtml(input: unknown): string {
  const text = getTextValue(input);
  if (!text) return '';

  const withoutNoise = text.replace(NOISE_BLOCK, ' ').replace(NOISE_SELF_CLOSING, ' ');

  const structured = withoutNoise
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(BLOCK_CLOSE, '\n\n')
    .replace(BLOCK_OPEN, '\n\n');

  return normalizeText(he.decode(striptags(structured)));
}

const MONTH =
  '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';

const DATE_TOKEN_SOURCE = [
  `\\b${MONTH}\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?(?:,?\\s+(?:19|20)\\d{2})?\\b`,
  `\\b\\d{1,2}(?:st|nd|rd|th)?\\s+${MONTH}\\.?(?:,?\\s+(?:19|20)\\d{2})?\\b`,
  '\\b(?:19|20)\\d{2}-\\d{2}-\\d{2}\\b',
  '\\b\\d{1,2}\\/\\d{1,2}\\/\\d{2,4}\\b',
  '\\b(?:19|20)\\d{2}\\b',
].join('|');

const DATE_TOKEN = new RegExp(DATE_TOKEN_SOURCE, 'i');
const DATE_METADATA_PREFIX =
  /^(?:(?:this\s+(?:article|story|post)\s+)?(?:was\s+)?(?:originally\s+)?(?:published|updated|posted)|last\s+updated|last\s+modified|modified|first\s+published|date)\b/i;
const RELATIVE_DATE_METADATA =
  /^(?:published|updated|posted|last\s+updated)\s+(?:just\s+now|\d+\s+(?:second|minute|hour|day|week|month|year)s?\s+ago)$/i;

const BYLINE_PREFIX = /^(?:by|written\s+by|author|posted\s+by)\s*[:\-–—]?\s*/i;
const BYLINE_NAME = /^[A-Z][A-Za-z.''-]+(?:\s+[A-Z][A-Za-z.''-]+){0,3}$/;
const CREDIT =
  /^(?:(?:photo|image)\s+)?(?:credit|credits|source|via|by|file\s+photo|screenshot|illustration|photo\s+credit|image\s+credit)\s*[:\-–—]?\s*\S.*$/i;
const IMAGE_ATTRIBUTION = /^(?:photo|image)\s*[:\-–—]\s*.+$/i;
const NAVIGATION =
  /^(?:read\s+more|read\s+also|related(?:\s+(?:articles?|stories|coverage))?|see\s+also|also\s+read|more\s+from|continue\s+reading|you\s+may\s+also\s+like)\b.{0,200}$/i;
const MEDIA_PROMPT = /^(?:watch|listen)\s*[:\-–—]\s*.{1,200}$/i;
const PROMO =
  /^(?:advertisement|subscribe(?:\s+now)?|sign\s+up(?:\s+for.*)?|share\s+this(?:\s+(?:article|story|post))?|follow\s+us(?:\s+on.*)?|download\s+(?:the|our)\s+app)\b.{0,160}$/i;
const WORDPRESS_FOOTER = /^the\s+post\s+.{0,300}?\s+appeared\s+first\s+on\s+.{0,200}\.?$/i;
const URL_ONLY = /^(?:https?:\/\/|www\.)\S+$/i;
const ARABIC_BYLINE = /^(?:بواسطة|المصدر|اقرأ\s+أيضا|اقرأ\s+أيضًا|تابعنا|شارك)(?:\s|:|：|$)/;
const ARABIC_DATE = /^(?:نشر|تم\s+النشر|آخر\s+تحديث|تاريخ\s+النشر)(?:\s|:|：|$)/;

// UI artifacts that leak from the website interface
const UI_ARTIFACT =
  /^(?:link\s+copied\s+to\s+clipboard|follow|back\s+to\s+top|scroll\s+to\s+top|share|print\s+this\s+(?:article|page))\s*$/i;

// Authentication prompts
const AUTH_PROMPT =
  /^(?:sign\s+in|log\s+in|create\s+an?\s+account|register)(?:\s+to\s+(?:your\s+)?\w+(?:\s+account)?)?\.?\s*$/i;

// Game/article metadata labels that appear as standalone lines
const METADATA_LABEL =
  /^(?:systems?|released?|platform(?:s)?|developer(?:s)?\(s\)?|publisher(?:s)?\(s\)?|genre(?:s)?|rating|esrb|pegi)\s*[:\-–—]?\s*$/i;

// Standalone dates in metadata blocks (release dates without prefix)
const STANDALONE_DATE =
  /^(?:(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2},?\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2})$/i;

// ESRB/PEGI ratings with descriptors
const CONTENT_RATING =
  /^(?:everyone|teen|mature|adults?\s+only|e\d*|t|m|ao|pegi\s+\d+)(?:\s*\/\/?\s*[\w\s,]+)?$/i;

// Author bio indicators - paragraphs about the writer rather than the article
const AUTHOR_BIO_INTRO =
  /^[A-Z][a-z]+\s+(?:is|was|has\s+been)\s+(?:a|an|the)\s+(?:writer|editor|journalist|contributor|reporter|senior|staff|freelance)/i;

function stripUnitEdges(value: string): string {
  return value.replace(/^[\s|•·\-–—:]+|[\s|•·\-–—:]+$/g, '').trim();
}

function isDateMetadata(unit: string): boolean {
  const match = unit.match(DATE_METADATA_PREFIX);
  if (!match) return false;

  const rest = unit.slice(match[0].length);
  if (!DATE_TOKEN.test(rest)) return false;

  const remainder = rest
    .replace(new RegExp(DATE_TOKEN_SOURCE, 'gi'), ' ')
    .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:[ap]\.?\s?m\.?)?\b/gi, ' ')
    .replace(/\b(?:UTC|GMT|[ECMP][SD]T|[+-]\d{1,2}(?::?\d{2})?)\b/gi, ' ')
    .replace(/\b(?:at|on|by|published|updated|posted|modified)\b/gi, ' ')
    .replace(/[\s,|;:•·\-–—]+/g, ' ')
    .trim();

  return remainder ? remainder.split(/\s+/).length <= 2 : true;
}

function isByline(unit: string): boolean {
  const match = unit.match(BYLINE_PREFIX);
  if (!match) return false;

  return BYLINE_NAME.test(unit.slice(match[0].length).trim());
}

function isArabicMetadata(unit: string): boolean {
  if (ARABIC_BYLINE.test(unit)) return unit.length <= 160;
  if (ARABIC_DATE.test(unit)) return /\d/.test(unit);
  return false;
}

function isAuthorBio(unit: string): boolean {
  // Check for intro pattern
  if (AUTHOR_BIO_INTRO.test(unit)) return true;

  // Check for hours-played patterns common in gaming bios - must mention specific game/platform with capital letter
  // and be in a sentence talking about the person (has "she", "he", "they" or author name)
  if (
    /(?:\d{1,3}(?:,\d{3})+|\d+)\s+hours?\s+in\s+[A-Z]/i.test(unit) &&
    /\b(?:she|he|they|has|her|his|their)\b/i.test(unit)
  ) {
    return true;
  }

  // Check for professional background patterns - must have year to be specific
  if (/\b(?:BA|MA|Master'?s|Bachelor'?s|degree)\s+(?:in|from)\b/i.test(unit) && /\d{4}/.test(unit))
    return true;
  if (/\bprofessional\s+experience\s+as\b/i.test(unit)) return true;

  // Check for "favorite articles" or "proud of" patterns - must reference site/publication
  if (/\b(?:favorite|favourite)\s+articles?\s+(?:for|at)\s+\w/i.test(unit)) return true;
  if (/\b(?:proud\s+of|proudest)\b/i.test(unit) && /\barticle/i.test(unit)) return true;

  return false;
}

/** True when a whole line/paragraph/sentence is metadata rather than content. */
function isMetadataUnit(value: string): boolean {
  const unit = stripUnitEdges(value);
  if (!unit) return true;

  if (URL_ONLY.test(unit)) return true;
  if (isDateMetadata(unit)) return true;
  if (RELATIVE_DATE_METADATA.test(unit)) return true;
  if (isByline(unit)) return true;
  if (CREDIT.test(unit)) return true;
  if (IMAGE_ATTRIBUTION.test(unit)) return true;
  if (NAVIGATION.test(unit)) return true;
  if (MEDIA_PROMPT.test(unit)) return true;
  if (PROMO.test(unit)) return true;
  if (WORDPRESS_FOOTER.test(unit)) return true;
  if (isArabicMetadata(unit)) return true;
  if (UI_ARTIFACT.test(unit)) return true;
  if (AUTH_PROMPT.test(unit)) return true;
  if (METADATA_LABEL.test(unit)) return true;
  if (STANDALONE_DATE.test(unit)) return true;
  if (CONTENT_RATING.test(unit)) return true;
  if (isAuthorBio(unit)) return true;

  return false;
}

function cleanLine(line: string): string {
  const trimmed = line.trim();
  if (!trimmed) return '';
  if (isMetadataUnit(trimmed)) return '';

  return trimmed
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => !isMetadataUnit(sentence))
    .join(' ')
    .trim();
}

/**
 * Removes standalone metadata lines and metadata-only sentences. Rules are
 * anchored to a whole line/paragraph/sentence, so a substantive sentence that
 * merely mentions a date (or the word "published") is preserved.
 */
export function removeBoilerplate(text: string): string {
  const paragraphs = text.split(/\n{2,}/);
  const keptParagraphs: string[] = [];

  for (const paragraph of paragraphs) {
    const keptLines = paragraph
      .split('\n')
      .map(cleanLine)
      .filter((line) => Boolean(line));

    if (keptLines.length) keptParagraphs.push(keptLines.join('\n'));
  }

  return keptParagraphs.join('\n\n');
}

function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** Drops a leading title repeat and adjacent duplicate paragraphs. */
export function dedupeBlocks(text: string, title?: string): string {
  const titleKey = title ? normalizeKey(title) : '';
  const seen = new Set<string>();
  const kept: string[] = [];

  for (const block of text.split(/\n{2,}/)) {
    const trimmed = block.trim();
    const key = normalizeKey(trimmed);
    if (!key) continue;
    if (titleKey && kept.length === 0 && key === titleKey) continue;
    if (seen.has(key)) continue;

    seen.add(key);
    kept.push(trimmed);
  }

  return kept.join('\n\n');
}

/** Full description cleanup: HTML → text → boilerplate removal → dedupe. */
export function cleanDescription(input: unknown, opts: { title?: string } = {}): string {
  const text = stripHtml(input);
  if (!text) return '';

  return normalizeText(dedupeBlocks(removeBoilerplate(text), opts.title));
}

function truncateAtWord(value: string, maxChars: number): string {
  const text = value.replace(/\s+/g, ' ').trim();
  if (text.length <= maxChars) return text;

  const window = text.slice(0, maxChars + 1);
  const lastSpace = window.lastIndexOf(' ');
  const minimumBoundary = Math.max(1, Math.floor(maxChars * 0.5));
  let cut = lastSpace >= minimumBoundary ? window.slice(0, lastSpace) : text.slice(0, maxChars);

  cut = cut.replace(/[\s,;:\-–—|]+$/g, '').trim();
  // If we cut aggressively to avoid mid-word, ensure we don't leave trailing punctuation mid-thought
  cut = cut.replace(/[.,:;]+$/g, '').trim();

  return cut;
}

/** Single-line, word-boundary teaser for push notification bodies. */
export function buildTeaser(input: unknown, maxChars = 150): string {
  const text = cleanDescription(input);
  if (!text) return '';

  return truncateAtWord(text, maxChars);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const SEPARATOR_BYLINE =
  /\s+[|–—-]\s*(?:by|written\s+by|posted\s+by)\s+[A-Z][A-Za-z.'’-]+(?:\s+[A-Z][A-Za-z.'’-]+){0,3}\s*$/i;

/**
 * Normalizes a headline for display. Only removes a site suffix when it
 * matches the known source name, and only removes a byline when an explicit
 * metadata separator precedes it — so titles like "Play By Ear" survive.
 */
export function cleanHeadline(input: unknown, opts: { siteName?: string } = {}): string {
  let title = stripHtml(input);
  if (!title) return '';

  title = title.replace(/\s+/g, ' ').trim();

  const site = opts.siteName?.trim();
  const siteSuffix = site
    ? new RegExp(`\\s+[|\\-–—:]\\s*${escapeRegExp(site)}(?:\\.(?:com|net|org))?\\s*$`, 'i')
    : null;

  // Two passes so either ordering of "site | byline" is handled.
  for (let pass = 0; pass < 2; pass++) {
    const before = title;
    if (siteSuffix) title = title.replace(siteSuffix, '').trim();
    title = title.replace(SEPARATOR_BYLINE, '').trim();
    if (title === before) break;
  }

  return title;
}

/** Single-line, word-boundary push notification title. */
export function buildPushTitle(
  input: unknown,
  opts: { siteName?: string; maxChars?: number } = {},
): string {
  return truncateAtWord(cleanHeadline(input, { siteName: opts.siteName }), opts.maxChars ?? 150);
}
