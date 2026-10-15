import { describe, it, expect } from 'vitest';

import {
  SUMMARY_LANGUAGES,
  LANGUAGE_TO_ATTRIBUTE,
  LANGUAGE_TO_JSON_KEY,
  JSON_KEY_TO_LANGUAGE,
  PER_LANGUAGE_MAX_CHARS,
  cleanSummary,
  parseSummaries,
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
