import { describe, it, expect } from 'vitest';

import {
  ARTICLE_SUMMARY_ATTRIBUTES,
  ARTICLE_SUMMARY_INDEXES,
  PLATFORM_STRING_SIZE,
  SUMMARY_STRING_SIZE,
  diffArticleSummaryAttributes,
  diffArticleSummaryIndexes,
} from './articleSummaryAttributes';
import type { DesiredIndex, ExistingAttribute, ExistingIndex } from './articleSummaryAttributes';
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

/** Convenience builder for an "already correct" index. */
function asExistingIndex(key: string, extra: Partial<ExistingIndex> = {}): ExistingIndex {
  return { key, type: 'key', attributes: ['platforms'], orders: ['asc'], ...extra };
}

describe('ARTICLE_SUMMARY_ATTRIBUTES', () => {
  it('declares the 7 language strings, 3 state fields, and 2 platform fields', () => {
    expect(ARTICLE_SUMMARY_ATTRIBUTES).toHaveLength(12);
    expect(ARTICLE_SUMMARY_ATTRIBUTES.map((a) => a.key)).toEqual([
      ...SUMMARY_LANGUAGES.map((language) => LANGUAGE_TO_ATTRIBUTE[language]),
      'summaries_at',
      'summaries_attempts',
      'summaries_failed',
      'platforms',
      'platforms_source',
    ]);
  });

  it('derives the summary keys from the shared language map (no drift)', () => {
    const stringKeys = ARTICLE_SUMMARY_ATTRIBUTES.filter((a) => a.type === 'string')
      .filter((a) => a.size === SUMMARY_STRING_SIZE)
      .map((a) => a.key);

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

  it('sizes the summary attributes above the longest generation cap', () => {
    const longestCap = Math.max(...Object.values(PER_LANGUAGE_MAX_CHARS));
    expect(SUMMARY_STRING_SIZE).toBeGreaterThanOrEqual(longestCap);

    for (const attribute of ARTICLE_SUMMARY_ATTRIBUTES) {
      if (attribute.key.startsWith('summary_')) {
        expect(attribute.size).toBe(SUMMARY_STRING_SIZE);
      }
    }
  });

  it('declares the platform attributes as an optional string array + provenance', () => {
    const byKey = new Map(ARTICLE_SUMMARY_ATTRIBUTES.map((a) => [a.key, a]));

    expect(byKey.get('platforms')).toMatchObject({
      type: 'string',
      required: false,
      array: true,
      size: PLATFORM_STRING_SIZE,
    });
    expect(byKey.get('platforms_source')).toMatchObject({
      type: 'string',
      required: false,
      size: PLATFORM_STRING_SIZE,
    });
    // Provenance is a single value, never an array.
    expect(byKey.get('platforms_source')?.array).toBeUndefined();
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

describe('ARTICLE_SUMMARY_INDEXES', () => {
  it('declares no indexes because Appwrite cannot index an array attribute', () => {
    // `Query.contains('platforms', [...])` works without an index; creating one
    // is rejected by Appwrite ("Creating indexes on array attributes ...").
    expect(ARTICLE_SUMMARY_INDEXES).toEqual([]);
  });
});

describe('diffArticleSummaryAttributes', () => {
  it('reports everything as missing on an empty collection', () => {
    const diff = diffArticleSummaryAttributes([]);
    expect(diff.missing).toHaveLength(12);
    expect(diff.matched).toHaveLength(0);
    expect(diff.mismatched).toHaveLength(0);
  });

  it('reports everything as matched when the schema already exists', () => {
    const existing = ARTICLE_SUMMARY_ATTRIBUTES.map((a) =>
      asExisting(a.key, a.type, {
        size: a.size,
        min: a.min,
        max: a.max,
        array: a.array,
      }),
    );
    const diff = diffArticleSummaryAttributes(existing);
    expect(diff.missing).toHaveLength(0);
    expect(diff.mismatched).toHaveLength(0);
    expect(diff.matched).toHaveLength(12);
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
    expect(diff.missing).toHaveLength(9);
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

  it('flags a non-array platforms attribute so a plain string column is not silently accepted', () => {
    const existing = [
      asExisting('platforms', 'string', { size: PLATFORM_STRING_SIZE, array: false }),
    ];
    const diff = diffArticleSummaryAttributes(existing);
    const mismatch = diff.mismatched.find((m) => m.desired.key === 'platforms');
    expect(mismatch?.reasons.join()).toMatch(/array false ≠ true/);
    expect(diff.missing.map((a) => a.key)).not.toContain('platforms');
  });
});

describe('diffArticleSummaryIndexes', () => {
  // The default list is empty (array attributes cannot be indexed), but the diff
  // machinery stays generic and is exercised with an explicit desired index.
  const desired: DesiredIndex[] = [
    { key: 'idx_example', type: 'key', attributes: ['category'], orders: ['asc'] },
  ];

  it('reports an index as missing on a collection without it', () => {
    const diff = diffArticleSummaryIndexes([], desired);
    expect(diff.missing.map((i) => i.key)).toEqual(['idx_example']);
  });

  it('reports nothing to do for the real (empty) desired list', () => {
    const diff = diffArticleSummaryIndexes([]);
    expect(diff.missing).toHaveLength(0);
    expect(diff.matched).toHaveLength(0);
    expect(diff.mismatched).toHaveLength(0);
  });

  it('matches an equivalent index regardless of index type casing or order', () => {
    const diff = diffArticleSummaryIndexes(
      [asExistingIndex('idx_example', { type: 'key', attributes: ['category'], orders: ['ASC'] })],
      desired,
    );
    expect(diff.missing).toHaveLength(0);
    expect(diff.mismatched).toHaveLength(0);
    expect(diff.matched.map((i) => i.key)).toEqual(['idx_example']);
  });

  it('treats an index on the wrong attribute as a mismatch, not as missing', () => {
    const diff = diffArticleSummaryIndexes(
      [asExistingIndex('idx_example', { attributes: ['platforms'] })],
      desired,
    );
    expect(diff.missing).toHaveLength(0);
    expect(diff.mismatched.map((m) => m.desired.key)).toEqual(['idx_example']);
    expect(diff.mismatched[0].reasons.join()).toMatch(/attributes/);
  });
});
