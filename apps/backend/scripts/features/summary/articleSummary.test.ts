import { describe, it, expect } from 'vitest';

import {
  SUMMARY_LANGUAGES,
  LANGUAGE_TO_ATTRIBUTE,
  LANGUAGE_TO_JSON_KEY,
  JSON_KEY_TO_LANGUAGE,
  PER_LANGUAGE_MAX_CHARS,
  BACKFILL_NEWEST,
  BACKFILL_OLDEST,
  BACKFILL_MAX_ARTICLES_PER_MINUTE,
  cleanSummary,
  pacingDelayMs,
  parseSummaries,
  sanitizeQueueLimit,
  buildPendingQueueQuery,
  parseBackfillLimit,
  pendingSummaryFilters,
} from './articleSummary.shared';

describe('parseSummaries', () => {
  it('keeps every valid language when the model returns all 7', () => {
    const result = parseSummaries(
      JSON.stringify({
        en: 'English summary',
        ar: 'ملخص عربي',
        es: 'Resumen en español',
        fr: 'Résumé en français',
        hi: 'हिन्दी सारांश',
        pt_br: 'Resumo em português do Brasil',
        pt_pt: 'Resumo em português de Portugal',
      }),
    );

    expect(Object.keys(result)).toHaveLength(7);
    expect(result.en).toBe('English summary');
    expect(result['pt-BR']).toBe('Resumo em português do Brasil');
    expect(result['pt-PT']).toBe('Resumo em português de Portugal');
  });

  it('stores partial results when a single language is missing', () => {
    const result = parseSummaries(
      JSON.stringify({
        en: 'English summary',
        ar: 'ملخص عربي',
        es: 'Resumen',
        fr: 'Résumé',
        // hi intentionally missing
        pt_br: 'Resumo BR',
        pt_pt: 'Resumo PT',
      }),
    );

    expect(result.hi).toBeUndefined();
    expect(result.en).toBe('English summary');
    expect(Object.keys(result)).toHaveLength(6);
  });

  it('drops non-string and blank values without discarding valid ones', () => {
    const result = parseSummaries(
      JSON.stringify({
        en: 'Valid English',
        ar: 42,
        es: '   ',
        fr: null,
        hi: 'मान्य',
        pt_br: 'Válido',
        pt_pt: 'Válido',
      }),
    );

    expect(Object.keys(result).sort()).toEqual(['en', 'hi', 'pt-BR', 'pt-PT'].sort());
  });

  it('throws when the payload is not valid JSON', () => {
    expect(() => parseSummaries('not json')).toThrow(/Failed to parse AI JSON/);
  });

  it('throws when the payload is not an object', () => {
    expect(() => parseSummaries('[1,2,3]')).toThrow(/not an object/);
  });
});

describe('cleanSummary', () => {
  it('collapses whitespace and strips markdown/quote wrappers', () => {
    const cleaned = cleanSummary('```\n## Heading\n\n"Great   news"\n```', 'en');
    expect(cleaned).toBe('Heading "Great news"');
  });

  it('caps English at 280 characters without cutting mid-word', () => {
    const long = Array.from({ length: 100 }, (_, i) => `word${i}`).join(' ');
    const cleaned = cleanSummary(long, 'en');

    expect(cleaned.length).toBeLessThanOrEqual(PER_LANGUAGE_MAX_CHARS.en);
    // Ends on a whole word — no partial "wor..." truncation.
    expect(cleaned.split(' ').every((word) => /^word\d+$/.test(word))).toBe(true);
  });

  it('allows a longer cap for Arabic', () => {
    const long = 'ا'.repeat(500);
    const cleaned = cleanSummary(long, 'ar');
    expect(cleaned.length).toBe(PER_LANGUAGE_MAX_CHARS.ar);
  });
});

describe('language mappings', () => {
  it('pins the Appwrite attribute per language (must match packages/utils getSummaryKey)', () => {
    expect(LANGUAGE_TO_ATTRIBUTE).toEqual({
      en: 'summary_en',
      ar: 'summary_ar',
      es: 'summary_es',
      fr: 'summary_fr',
      hi: 'summary_hi',
      'pt-BR': 'summary_pt_br',
      'pt-PT': 'summary_pt_pt',
    });
  });

  it('round-trips JSON keys ↔ languages and covers every language', () => {
    expect(SUMMARY_LANGUAGES).toHaveLength(7);
    for (const language of SUMMARY_LANGUAGES) {
      const jsonKey = LANGUAGE_TO_JSON_KEY[language];
      expect(JSON_KEY_TO_LANGUAGE[jsonKey]).toBe(language);
    }
  });
});

describe('backfill queue limits', () => {
  it('skips a zero/invalid queue instead of building Query.limit(0)', () => {
    expect(buildPendingQueueQuery('asc', 0)).toBeNull();
    expect(buildPendingQueueQuery('desc', -1)).toBeNull();
    expect(buildPendingQueueQuery('desc', Number.NaN)).toBeNull();
    expect(buildPendingQueueQuery('desc', Number.POSITIVE_INFINITY)).toBeNull();
    expect(buildPendingQueueQuery('desc', 1.5)).toBeNull();
  });

  it('builds a query for every valid positive integer limit', () => {
    expect(buildPendingQueueQuery('desc', 2)).toEqual({ order: 'desc', limit: 2 });
    expect(buildPendingQueueQuery('asc', 10)).toEqual({ order: 'asc', limit: 10 });
    expect(buildPendingQueueQuery('desc', 1)).toEqual({ order: 'desc', limit: 1 });
  });

  it('sanitizes undefined/NaN/negative to the fallback and keeps 0 as the skip signal', () => {
    expect(sanitizeQueueLimit(undefined, 20)).toBe(20);
    expect(sanitizeQueueLimit(Number.NaN, 10)).toBe(10);
    expect(sanitizeQueueLimit(Number.POSITIVE_INFINITY, 10)).toBe(10);
    expect(sanitizeQueueLimit(-3, 10)).toBe(10);
    expect(sanitizeQueueLimit(0, 10)).toBe(0);
    expect(sanitizeQueueLimit(2.9, 10)).toBe(2);
  });

  it('parses --limit into a strictly positive integer or undefined', () => {
    expect(parseBackfillLimit(['--limit', '2'])).toBe(2);
    expect(parseBackfillLimit(['--limit=2'])).toBe(2);
    expect(parseBackfillLimit(['--limit', '2.9'])).toBe(2);
    expect(parseBackfillLimit(['--limit', 'abc'])).toBeUndefined();
    expect(parseBackfillLimit(['--limit', '0'])).toBeUndefined();
    expect(parseBackfillLimit(['--limit', '-4'])).toBeUndefined();
    expect(parseBackfillLimit(['--limit'])).toBeUndefined();
    expect(parseBackfillLimit(['--app-env', '.env.staging'])).toBeUndefined();
    expect(parseBackfillLimit([], '5')).toBe(5);
    expect(parseBackfillLimit([], 'nope')).toBeUndefined();
  });

  it('regression: `--limit 2` produces exactly one query, and every emitted limit is >= 1', () => {
    // Mirrors the real CLI path: `summary:articles -- --limit 2 --app-env ...`
    const limit = parseBackfillLimit(['--limit', '2', '--app-env', '.env.staging']);
    expect(limit).toBe(2);

    const options = limit ? { newest: limit, oldest: 0 } : {};
    const newestLimit = sanitizeQueueLimit(options.newest, BACKFILL_NEWEST);
    const oldestLimit = sanitizeQueueLimit(options.oldest, BACKFILL_OLDEST);

    const queues = [
      buildPendingQueueQuery('desc', newestLimit),
      buildPendingQueueQuery('asc', oldestLimit),
    ].filter((queue) => queue !== null);

    // The oldest queue is skipped (oldest: 0) → no Query.limit(0) is ever built.
    expect(queues).toEqual([{ order: 'desc', limit: 2 }]);
    for (const queue of queues) {
      expect(Number.isInteger(queue.limit)).toBe(true);
      expect(queue.limit).toBeGreaterThanOrEqual(1);
    }
  });

  it('uses the default batch sizes (both queues) when no limit is given', () => {
    const options: { newest?: number; oldest?: number } = {};
    const newestLimit = sanitizeQueueLimit(options.newest, BACKFILL_NEWEST);
    const oldestLimit = sanitizeQueueLimit(options.oldest, BACKFILL_OLDEST);

    expect(buildPendingQueueQuery('desc', newestLimit)).toEqual({
      order: 'desc',
      limit: BACKFILL_NEWEST,
    });
    expect(buildPendingQueueQuery('asc', oldestLimit)).toEqual({
      order: 'asc',
      limit: BACKFILL_OLDEST,
    });
  });
});

describe('pacingDelayMs', () => {
  it('waits out the remainder of a fast batch to hit the target rate', () => {
    // 3 articles at 13/min must be ~13.85s apart; a 2s batch waits the rest.
    expect(pacingDelayMs(3, 2_000, 13)).toBe(11_847);
    expect(pacingDelayMs(3, 0, 13)).toBe(13_847);
  });

  it('never slows a batch that was already slower than the target rate', () => {
    expect(pacingDelayMs(3, 20_000, 13)).toBe(0);
    expect(pacingDelayMs(3, 60_000, 13)).toBe(0);
  });

  it('keeps the long-run rate at or below the ceiling when batches are instant', () => {
    const batchSize = 3;
    const delayMs = pacingDelayMs(batchSize, 0, BACKFILL_MAX_ARTICLES_PER_MINUTE);
    const articlesPerMinute = (batchSize / delayMs) * 60_000;

    expect(articlesPerMinute).toBeLessThanOrEqual(BACKFILL_MAX_ARTICLES_PER_MINUTE);
    expect(BACKFILL_MAX_ARTICLES_PER_MINUTE).toBeGreaterThanOrEqual(12);
    expect(BACKFILL_MAX_ARTICLES_PER_MINUTE).toBeLessThanOrEqual(14);
  });

  it('never lets a sliding 60s window exceed the ceiling', () => {
    // The quota is a rolling window, not a fixed one, so a burst at the window
    // boundary must not push the count over the ceiling.
    const batchSize = 3;
    const delayMs = pacingDelayMs(batchSize, 0, BACKFILL_MAX_ARTICLES_PER_MINUTE);
    const batchStarts = Array.from({ length: 12 }, (_, index) => index * delayMs);

    for (const windowStart of batchStarts) {
      const inWindow = batchStarts.filter(
        (start) => start >= windowStart && start < windowStart + 60_000,
      );
      expect(inWindow.length * batchSize).toBeLessThanOrEqual(BACKFILL_MAX_ARTICLES_PER_MINUTE);
    }
  });

  it('returns 0 for degenerate input instead of NaN/Infinity', () => {
    expect(pacingDelayMs(0, 100, 13)).toBe(0);
    expect(pacingDelayMs(3, 100, 0)).toBe(0);
    expect(pacingDelayMs(Number.NaN, 100, 13)).toBe(0);
    expect(pacingDelayMs(3, Number.POSITIVE_INFINITY, 13)).toBe(13_847);
    expect(pacingDelayMs(3, Number.NEGATIVE_INFINITY, 13)).toBe(13_847);
  });
});

describe('pending summary filters', () => {
  it('matches unsummarized articles and treats null summaries_failed as pending', () => {
    const filters = pendingSummaryFilters();
    expect(filters).toHaveLength(2);

    expect(filters[0]).toContain('"method":"isNull"');
    expect(filters[0]).toContain('"attribute":"summaries_at"');

    const failureFilter = JSON.parse(filters[1]) as {
      method: string;
      attribute?: string;
      values?: Array<{ method: string; attribute: string; values?: unknown[] }>;
    };
    expect(failureFilter.method).toBe('or');
    expect(failureFilter.values).toEqual([
      { method: 'equal', attribute: 'summaries_failed', values: [false] },
      { method: 'isNull', attribute: 'summaries_failed' },
    ]);
  });

  it('regression: accepts both false and unset summaries_failed (Appwrite does not backfill defaults)', () => {
    // Documents that predate the attribute read as `null`, not `false`, so a
    // plain `summaries_failed = false` filter silently skips the whole backlog.
    // The OR branch must include an explicit isNull clause.
    const [, failureFilter] = pendingSummaryFilters();
    expect(failureFilter).toContain('"method":"or"');
    expect(failureFilter).toContain('"equal"');
    expect(failureFilter).toContain('"isNull"');
    expect(failureFilter).toContain('"attribute":"summaries_failed"');
    expect(failureFilter).not.toBe(
      '{"method":"equal","attribute":"summaries_failed","values":[false]}',
    );
  });
});
