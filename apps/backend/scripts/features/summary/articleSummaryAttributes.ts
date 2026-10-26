import { LANGUAGE_TO_ATTRIBUTE, SUMMARY_LANGUAGES } from './articleSummary.shared';

/**
 * Appwrite string size for each `summary_*` attribute. Deliberately larger than
 * the longest per-language generation cap (`PER_LANGUAGE_MAX_CHARS`) so a stored
 * summary can never be rejected at write time for being too long.
 */
export const SUMMARY_STRING_SIZE = 500;

/** Appwrite string size for platform ids / provenance values. */
export const PLATFORM_STRING_SIZE = 16;

export type ArticleSummaryAttributeType = 'string' | 'integer' | 'boolean' | 'datetime';

export interface DesiredAttribute {
  key: string;
  type: ArticleSummaryAttributeType;
  required: boolean;
  /** string attributes only */
  size?: number;
  /** integer attributes only */
  min?: number;
  max?: number;
  /** string attributes only — store a list of values instead of one */
  array?: boolean;
  /** value applied to documents created without the field (creation-time only) */
  xdefault?: string | number | boolean;
}

/** Minimal shape of an Appwrite attribute as returned by `getCollection`. */
export interface ExistingAttribute {
  key: string;
  type: string;
  required?: boolean;
  size?: number;
  min?: number;
  max?: number;
  array?: boolean;
  default?: unknown;
  status?: string;
}

/**
 * The exact `articles` attributes the summary feature reads/writes. The seven
 * `summary_*` keys are derived from the shared language map so they can never
 * drift from what the write side (`articleSummary.service.ts`) and the read side
 * (`packages/utils` → `getSummaryKey`) expect.
 */
export const ARTICLE_SUMMARY_ATTRIBUTES: DesiredAttribute[] = [
  ...SUMMARY_LANGUAGES.map((language) => ({
    key: LANGUAGE_TO_ATTRIBUTE[language],
    type: 'string' as const,
    size: SUMMARY_STRING_SIZE,
    required: false,
  })),
  { key: 'summaries_at', type: 'datetime', required: false },
  { key: 'summaries_attempts', type: 'integer', required: false, min: 0, xdefault: 0 },
  { key: 'summaries_failed', type: 'boolean', required: false, xdefault: false },
  // Platform classification: one article maps to any subset of the six ids
  // (a general article stores all six). `platforms_source` records provenance —
  // see `scripts/lib/articlePlatforms.ts`.
  { key: 'platforms', type: 'string', required: false, size: PLATFORM_STRING_SIZE, array: true },
  {
    key: 'platforms_source',
    type: 'string',
    required: false,
    size: PLATFORM_STRING_SIZE,
  },
];

export type ArticleIndexType = 'key' | 'unique' | 'fulltext';

export interface DesiredIndex {
  key: string;
  type: ArticleIndexType;
  attributes: string[];
  orders?: Array<'asc' | 'desc'>;
}

/** Minimal shape of an Appwrite index as returned by `getCollection`. */
export interface ExistingIndex {
  key: string;
  type?: string;
  attributes?: string[];
  orders?: Array<string | { value?: string }>;
  status?: string;
}

/**
 * No extra indexes are required. Appwrite refuses to create an index on an array
 * attribute ("Creating indexes on array attributes is not currently supported"),
 * but `Query.contains('platforms', [...])` — the query the mobile feed issues —
 * works without one (verified against production). The array scan costs a couple
 * of seconds on a few thousand articles, which is acceptable for a filtered feed.
 *
 * The list (and the diff/creation machinery below) is kept so a future
 * scalar/tag index can be added here without touching the migration script.
 */
export const ARTICLE_SUMMARY_INDEXES: DesiredIndex[] = [];

export interface AttributeMismatch {
  desired: DesiredAttribute;
  existing: ExistingAttribute;
  reasons: string[];
}

export interface AttributeDiff {
  missing: DesiredAttribute[];
  matched: DesiredAttribute[];
  mismatched: AttributeMismatch[];
}

/** Describes how an existing attribute diverges from the desired definition. */
function mismatchReasons(desired: DesiredAttribute, existing: ExistingAttribute): string[] {
  const reasons: string[] = [];

  if (existing.type !== desired.type) {
    reasons.push(`type ${existing.type} ≠ ${desired.type}`);
  }
  if ((existing.required ?? false) !== desired.required) {
    reasons.push(`required ${existing.required ?? false} ≠ ${desired.required}`);
  }
  if (desired.type === 'string' && existing.size !== undefined && existing.size !== desired.size) {
    reasons.push(`size ${existing.size} ≠ ${desired.size}`);
  }
  if ((existing.array ?? false) !== (desired.array ?? false)) {
    reasons.push(`array ${existing.array ?? false} ≠ ${desired.array ?? false}`);
  }
  if (desired.type === 'integer') {
    if (desired.min !== undefined && existing.min !== undefined && existing.min !== desired.min) {
      reasons.push(`min ${existing.min} ≠ ${desired.min}`);
    }
    if (desired.max !== undefined && existing.max !== undefined && existing.max !== desired.max) {
      reasons.push(`max ${existing.max} ≠ ${desired.max}`);
    }
  }

  return reasons;
}

/**
 * Compares the desired summary attributes against what the collection already
 * has. Pure and idempotent-friendly: the caller creates only `missing` and warns
 * about `mismatched` (existing schema is never altered).
 */
export function diffArticleSummaryAttributes(
  existing: ExistingAttribute[],
  desired: DesiredAttribute[] = ARTICLE_SUMMARY_ATTRIBUTES,
): AttributeDiff {
  const byKey = new Map(existing.map((attribute) => [attribute.key, attribute]));
  const diff: AttributeDiff = { missing: [], matched: [], mismatched: [] };

  for (const attribute of desired) {
    const current = byKey.get(attribute.key);
    if (!current) {
      diff.missing.push(attribute);
      continue;
    }

    const reasons = mismatchReasons(attribute, current);
    if (reasons.length > 0) {
      diff.mismatched.push({ desired: attribute, existing: current, reasons });
    } else {
      diff.matched.push(attribute);
    }
  }

  return diff;
}

export interface IndexMismatch {
  desired: DesiredIndex;
  existing: ExistingIndex;
  reasons: string[];
}

export interface IndexDiff {
  missing: DesiredIndex[];
  matched: DesiredIndex[];
  mismatched: IndexMismatch[];
}

/** Appwrite returns orders as `"asc"`/`"ASC"` or an `{ value }` object. */
function normalizeOrder(order: unknown): string {
  if (typeof order === 'string') return order.toLowerCase();
  if (order && typeof order === 'object' && 'value' in order) {
    return String((order as { value?: unknown }).value ?? '').toLowerCase();
  }
  return '';
}

function indexMismatchReasons(desired: DesiredIndex, existing: ExistingIndex): string[] {
  const reasons: string[] = [];

  if (existing.type !== undefined && existing.type !== desired.type) {
    reasons.push(`type ${existing.type} ≠ ${desired.type}`);
  }

  const existingAttributes = new Set((existing.attributes ?? []).map((key) => key.toLowerCase()));
  const desiredAttributes = desired.attributes.map((key) => key.toLowerCase());
  if (
    existingAttributes.size !== desiredAttributes.length ||
    desiredAttributes.some((key) => !existingAttributes.has(key))
  ) {
    reasons.push(
      `attributes [${(existing.attributes ?? []).join(', ')}] ≠ [${desired.attributes.join(', ')}]`,
    );
  }

  const existingOrders = (existing.orders ?? []).map(normalizeOrder);
  const desiredOrders = desired.orders ?? [];
  if (
    existingOrders.length > 0 &&
    desiredOrders.length > 0 &&
    existingOrders.join(',') !== desiredOrders.join(',')
  ) {
    reasons.push(`orders [${existingOrders.join(', ')}] ≠ [${desiredOrders.join(', ')}]`);
  }

  return reasons;
}

/**
 * Compares the desired platform indexes against the collection's existing ones.
 * Same contract as the attribute diff: create `missing`, warn about
 * `mismatched`, never alter an existing index.
 */
export function diffArticleSummaryIndexes(
  existing: ExistingIndex[],
  desired: DesiredIndex[] = ARTICLE_SUMMARY_INDEXES,
): IndexDiff {
  const byKey = new Map(existing.map((index) => [index.key, index]));
  const diff: IndexDiff = { missing: [], matched: [], mismatched: [] };

  for (const index of desired) {
    const current = byKey.get(index.key);
    if (!current) {
      diff.missing.push(index);
      continue;
    }

    const reasons = indexMismatchReasons(index, current);
    if (reasons.length > 0) {
      diff.mismatched.push({ desired: index, existing: current, reasons });
    } else {
      diff.matched.push(index);
    }
  }

  return diff;
}
