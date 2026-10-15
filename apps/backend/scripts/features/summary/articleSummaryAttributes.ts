import {
  LANGUAGE_TO_ATTRIBUTE,
  PER_LANGUAGE_MAX_CHARS,
  SUMMARY_LANGUAGES,
} from './articleSummary.shared';

/**
 * Appwrite string size for each `summary_*` attribute. Deliberately larger than
 * the longest per-language generation cap (`PER_LANGUAGE_MAX_CHARS`) so a stored
 * summary can never be rejected at write time for being too long.
 */
export const SUMMARY_STRING_SIZE = 500;

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
];

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
