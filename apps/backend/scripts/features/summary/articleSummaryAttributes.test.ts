import { describe, it, expect } from 'vitest';

import {
  ARTICLE_SUMMARY_ATTRIBUTES,
  SUMMARY_STRING_SIZE,
  diffArticleSummaryAttributes,
} from './articleSummaryAttributes';
import type { ExistingAttribute } from './articleSummaryAttributes';
import {
  LANGUAGE_TO_ATTRIBUTE,
  PER_LANGUAGE_MAX_CHARS,
  SUMMARY_LANGUAGES,
} from './articleSummary.shared';

/** Convenience builder for an "already correct" attribute. */
function asExisting(
  key: string,
  type: string,
  extra: Partial<ExistingAttribute> = {},
): ExistingAttribute {
  return { key, type, required: false, ...extra };
}

describe('ARTICLE_SUMMARY_ATTRIBUTES', () => {
  it('declares exactly the 7 language strings + 3 state fields', () => {
    expect(ARTICLE_SUMMARY_ATTRIBUTES).toHaveLength(10);
    expect(ARTICLE_SUMMARY_ATTRIBUTES.map((a) => a.key)).toEqual([
      ...SUMMARY_LANGUAGES.map((language) => LANGUAGE_TO_ATTRIBUTE[language]),
      'summaries_at',
      'summaries_attempts',
      'summaries_failed',
    ]);
  });

  it('derives the summary keys from the shared language map (no drift)', () => {
    const stringKeys = ARTICLE_SUMMARY_ATTRIBUTES.filter((a) => a.type === 'string').map(
      (a) => a.key,
    );
    expect(stringKeys).toEqual([
      'summary_en',
      'summary_ar',
      'summary_es',
      'summary_fr',
      'summary_hi',
      'summary_pt_br',
      'summary_pt_pt',
    ]);
  });

  it('sizes the string attributes above the longest generation cap', () => {
    const longestCap = Math.max(...Object.values(PER_LANGUAGE_MAX_CHARS));
    expect(SUMMARY_STRING_SIZE).toBeGreaterThanOrEqual(longestCap);

    for (const attribute of ARTICLE_SUMMARY_ATTRIBUTES) {
      if (attribute.type === 'string') expect(attribute.size).toBe(SUMMARY_STRING_SIZE);
    }
  });

  it('matches the plan for the state fields', () => {
    const byKey = new Map(ARTICLE_SUMMARY_ATTRIBUTES.map((a) => [a.key, a]));
    expect(byKey.get('summaries_at')).toMatchObject({ type: 'datetime', required: false });
    expect(byKey.get('summaries_attempts')).toMatchObject({
      type: 'integer',
      required: false,
      min: 0,
      xdefault: 0,
    });
    expect(byKey.get('summaries_failed')).toMatchObject({
      type: 'boolean',
      required: false,
      xdefault: false,
    });
  });
});

describe('diffArticleSummaryAttributes', () => {
  it('reports everything as missing on an empty collection', () => {
    const diff = diffArticleSummaryAttributes([]);
    expect(diff.missing).toHaveLength(10);
    expect(diff.matched).toHaveLength(0);
    expect(diff.mismatched).toHaveLength(0);
  });

  it('reports everything as matched when the schema already exists', () => {
    const existing = ARTICLE_SUMMARY_ATTRIBUTES.map((a) =>
      asExisting(a.key, a.type, { size: a.size, min: a.min, max: a.max }),
    );
    const diff = diffArticleSummaryAttributes(existing);
    expect(diff.missing).toHaveLength(0);
    expect(diff.mismatched).toHaveLength(0);
    expect(diff.matched).toHaveLength(10);
  });

  it('creates only the missing attributes (idempotent partial state)', () => {
    const existing = [
      asExisting('summary_en', 'string', { size: SUMMARY_STRING_SIZE }),
      asExisting('summary_ar', 'string', { size: SUMMARY_STRING_SIZE }),
      asExisting('summaries_at', 'datetime'),
    ];
    const diff = diffArticleSummaryAttributes(existing);
    expect(diff.matched.map((a) => a.key).sort()).toEqual([
      'summaries_at',
      'summary_ar',
      'summary_en',
    ]);
    expect(diff.missing.map((a) => a.key)).toContain('summary_es');
    expect(diff.missing).toHaveLength(7);
  });

  it('flags a wrong type, wrong size and wrong required flag without treating them as missing', () => {
    const existing = [
      asExisting('summary_en', 'integer'),
      asExisting('summary_es', 'string', { size: 64 }),
      asExisting('summaries_failed', 'boolean', { required: true }),
    ];
    const diff = diffArticleSummaryAttributes(existing);

    const byKey = new Map(diff.mismatched.map((m) => [m.desired.key, m]));
    expect(byKey.get('summary_en')?.reasons.join()).toMatch(/type integer ≠ string/);
    expect(byKey.get('summary_es')?.reasons.join()).toMatch(/size 64 ≠ 500/);
    expect(byKey.get('summaries_failed')?.reasons.join()).toMatch(/required true ≠ false/);

    // Mismatches must never be re-created as if they were absent.
    expect(diff.missing.map((a) => a.key)).not.toContain('summary_en');
  });
});
