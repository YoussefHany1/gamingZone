import { IndexType, Query } from 'node-appwrite';

import { logger } from './lib/logger';
import { loadBackendEnv } from './lib/env';
import { env } from './lib/config';
import { createAppwriteDatabases } from './lib/appwrite';
import { getErrorMessage } from './lib/errors';
import {
  ARTICLE_SUMMARY_ATTRIBUTES,
  ARTICLE_SUMMARY_INDEXES,
  diffArticleSummaryAttributes,
  diffArticleSummaryIndexes,
} from './features/summary/articleSummaryAttributes';
import type {
  DesiredAttribute,
  DesiredIndex,
  ExistingAttribute,
  ExistingIndex,
} from './features/summary/articleSummaryAttributes';

// Idempotently ensures the `articles` collection has every attribute the AI
// summary + platform classification features need. Safe to re-run: it creates
// only what is absent and reports (never alters) anything that already exists
// with a different shape.
//
// Indexes: Appwrite cannot create an index on an array attribute, so the
// `platforms` array is intentionally unindexed. `Query.contains('platforms', …)`
// works without one, so this script still exercises the exact mobile query at the
// end to catch a real regression (the generic index machinery remains available
// for future scalar indexes via ARTICLE_SUMMARY_INDEXES).
//
// Order matters: attributes are created first and awaited to `available` before
// any configured index is created, because Appwrite rejects an index over an
// attribute that is still processing.
//
// Usage:
//   npm run migrate:article-summaries                          # apps/backend/.env
//   npm run migrate:article-summaries -- --app-env .env.staging
//   npm run migrate:article-summaries -- --dry-run             # report only
//   npm run migrate:article-summaries -- --no-wait             # don't block until ready

loadBackendEnv();

const DATABASE_ID = env.APPWRITE_DATABASE_ID;
const COLLECTION_ID = env.ARTICLES_COLLECTION_ID;
const databases = createAppwriteDatabases();

const WAIT_TIMEOUT_MS = 120_000;
const POLL_INTERVAL_MS = 2_000;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function hasFlag(name: string): boolean {
  return process.argv.slice(2).includes(name);
}

function normalizeAttribute(raw: unknown): ExistingAttribute {
  const value = (raw ?? {}) as Record<string, unknown>;
  return {
    key: String(value.key ?? ''),
    type: String(value.type ?? ''),
    required: typeof value.required === 'boolean' ? value.required : undefined,
    size: typeof value.size === 'number' ? value.size : undefined,
    min: typeof value.min === 'number' ? value.min : undefined,
    max: typeof value.max === 'number' ? value.max : undefined,
    array: typeof value.array === 'boolean' ? value.array : undefined,
    default: value.default,
    status: typeof value.status === 'string' ? value.status : undefined,
  };
}

function normalizeIndex(raw: unknown): ExistingIndex {
  const value = (raw ?? {}) as Record<string, unknown>;
  return {
    key: String(value.key ?? ''),
    type: typeof value.type === 'string' ? value.type : undefined,
    attributes: Array.isArray(value.attributes)
      ? value.attributes.map((attribute) => String(attribute))
      : undefined,
    orders: Array.isArray(value.orders) ? value.orders : undefined,
    status: typeof value.status === 'string' ? value.status : undefined,
  };
}

interface CollectionState {
  attributes: ExistingAttribute[];
  indexes: ExistingIndex[];
}

async function readCollectionState(): Promise<CollectionState> {
  const collection = await databases.getCollection(DATABASE_ID, COLLECTION_ID);
  const raw = collection as unknown as { attributes?: unknown[]; indexes?: unknown[] };
  return {
    attributes: (raw.attributes ?? []).map(normalizeAttribute),
    indexes: (raw.indexes ?? []).map(normalizeIndex),
  };
}

async function createAttribute(attribute: DesiredAttribute): Promise<void> {
  const { key, type, required, size, min, max, array, xdefault } = attribute;

  switch (type) {
    case 'string':
      await databases.createStringAttribute({
        databaseId: DATABASE_ID,
        collectionId: COLLECTION_ID,
        key,
        size: size ?? 500,
        required,
        xdefault: xdefault as string | undefined,
        array,
      });
      return;
    case 'datetime':
      await databases.createDatetimeAttribute({
        databaseId: DATABASE_ID,
        collectionId: COLLECTION_ID,
        key,
        required,
        xdefault: xdefault as string | undefined,
      });
      return;
    case 'integer':
      await databases.createIntegerAttribute({
        databaseId: DATABASE_ID,
        collectionId: COLLECTION_ID,
        key,
        required,
        min,
        max,
        xdefault: xdefault as number | undefined,
      });
      return;
    case 'boolean':
      await databases.createBooleanAttribute({
        databaseId: DATABASE_ID,
        collectionId: COLLECTION_ID,
        key,
        required,
        xdefault: xdefault as boolean | undefined,
      });
      return;
  }
}

async function createIndex(index: DesiredIndex): Promise<void> {
  await databases.createIndex({
    databaseId: DATABASE_ID,
    collectionId: COLLECTION_ID,
    key: index.key,
    type: index.type as IndexType,
    attributes: index.attributes,
    orders: index.orders,
  });
}

async function waitFor<T>(
  describe: string,
  keys: string[],
  read: () => Promise<Map<string, T | undefined>>,
  statusOf: (value: T | undefined) => string | undefined,
  timeoutMs: number,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  for (;;) {
    const current = await read();
    const pending = keys.filter((key) => statusOf(current.get(key)) !== 'available');

    if (pending.length === 0) return;

    if (Date.now() >= deadline) {
      throw new Error(
        `Timed out waiting for ${describe} to become available: ${pending.join(', ')}`,
      );
    }

    await delay(POLL_INTERVAL_MS);
  }
}

/**
 * Runs the exact query the mobile feed issues for a platform filter. There is no
 * index on `platforms` (Appwrite cannot index array attributes) but the query
 * works anyway — this check makes sure that stays true.
 */
async function verifyPlatformsQuery(): Promise<number> {
  const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [
    Query.contains('platforms', ['pc']),
    Query.limit(1),
  ]);
  return response.total;
}

async function main(): Promise<void> {
  const dryRun = hasFlag('--dry-run');
  const wait = !hasFlag('--no-wait');

  logger.info(
    `🔎 Checking ${ARTICLE_SUMMARY_ATTRIBUTES.length} attributes and ${ARTICLE_SUMMARY_INDEXES.length} index(es) on ${DATABASE_ID}/${COLLECTION_ID}...`,
  );

  let state = await readCollectionState();
  const attributeDiff = diffArticleSummaryAttributes(state.attributes);
  const indexDiff = diffArticleSummaryIndexes(state.indexes);

  logger.info(
    `   attributes: ${attributeDiff.matched.length} matched · ${attributeDiff.missing.length} missing · ${attributeDiff.mismatched.length} mismatched`,
  );
  logger.info(
    `   indexes:    ${indexDiff.matched.length} matched · ${indexDiff.missing.length} missing · ${indexDiff.mismatched.length} mismatched`,
  );

  if (attributeDiff.missing.length > 0) {
    logger.info(`   missing attributes: ${attributeDiff.missing.map((a) => a.key).join(', ')}`);
  }
  if (indexDiff.missing.length > 0) {
    logger.info(`   missing indexes: ${indexDiff.missing.map((i) => i.key).join(', ')}`);
  }

  for (const item of attributeDiff.mismatched) {
    logger.warn(
      `   ⚠️ attribute "${item.desired.key}" exists but differs (${item.reasons.join('; ')}) — not altering it.`,
    );
  }
  for (const item of indexDiff.mismatched) {
    logger.warn(
      `   ⚠️ index "${item.desired.key}" exists but differs (${item.reasons.join('; ')}) — not altering it.`,
    );
  }

  if (dryRun) {
    logger.info('🧪 Dry run — nothing was created.');
    return;
  }

  // ── Attributes ────────────────────────────────────────────────────────────
  for (const attribute of attributeDiff.missing) {
    try {
      await createAttribute(attribute);
      logger.info(
        `➕ Created attribute "${attribute.key}" (${attribute.type}${attribute.array ? '[]' : ''}).`,
      );
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      // Already-existing (409/conflict) is fine — another run/operator won the race.
      if (/already exists|conflict|\b409\b/i.test(message)) {
        logger.info(`   "${attribute.key}" already exists — skipping.`);
        continue;
      }
      throw new Error(`Failed to create attribute "${attribute.key}": ${message}`, {
        cause: error,
      });
    }
  }

  // The platform index can only be created once its attribute is `available`.
  // Wait for anything we just created *and* for an indexed attribute left
  // processing by an earlier interrupted run.
  const indexedAttributeKeys = new Set(
    ARTICLE_SUMMARY_INDEXES.flatMap((index) => index.attributes),
  );

  if (wait) {
    const pendingAttributeKeys = [
      ...new Set([
        ...attributeDiff.missing.map((attribute) => attribute.key),
        ...state.attributes
          .filter(
            (attribute) =>
              indexedAttributeKeys.has(attribute.key) && attribute.status !== 'available',
          )
          .map((attribute) => attribute.key),
      ]),
    ];

    if (pendingAttributeKeys.length > 0) {
      logger.info('⏳ Waiting for Appwrite to finish creating the attributes...');
      await waitFor(
        'attributes',
        pendingAttributeKeys,
        async () => new Map((await readCollectionState()).attributes.map((a) => [a.key, a])),
        (attribute) => attribute?.status,
        WAIT_TIMEOUT_MS,
      );
    }
  }

  state = await readCollectionState();
  const remainingAttributes = diffArticleSummaryAttributes(state.attributes);
  if (remainingAttributes.missing.length > 0) {
    throw new Error(
      `Still missing attributes after creation: ${remainingAttributes.missing
        .map((a) => a.key)
        .join(', ')}`,
    );
  }

  // ── Indexes ───────────────────────────────────────────────────────────────
  const attributesReady = state.attributes
    .filter((attribute) =>
      ARTICLE_SUMMARY_INDEXES.some((index) => index.attributes.includes(attribute.key)),
    )
    .every((attribute) => attribute.status === 'available');

  if (!attributesReady) {
    logger.warn(
      '⚠️ Indexed attributes are not available yet — skipping index creation. Re-run with waiting enabled.',
    );
    return;
  }

  const pendingIndexDiff = diffArticleSummaryIndexes(state.indexes);
  for (const index of pendingIndexDiff.missing) {
    try {
      await createIndex(index);
      logger.info(
        `➕ Created index "${index.key}" (${index.type} on [${index.attributes.join(', ')}]).`,
      );
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      if (/already exists|conflict|\b409\b/i.test(message)) {
        logger.info(`   index "${index.key}" already exists — skipping.`);
        continue;
      }
      throw new Error(`Failed to create index "${index.key}": ${message}`, { cause: error });
    }
  }

  if (wait && ARTICLE_SUMMARY_INDEXES.length > 0) {
    logger.info('⏳ Waiting for Appwrite to finish building the indexes...');
    await waitFor(
      'indexes',
      ARTICLE_SUMMARY_INDEXES.map((index) => index.key),
      async () => new Map((await readCollectionState()).indexes.map((i) => [i.key, i])),
      (index) => index?.status,
      WAIT_TIMEOUT_MS,
    );
  }

  state = await readCollectionState();
  const remainingIndexes = diffArticleSummaryIndexes(state.indexes);
  if (remainingIndexes.missing.length > 0) {
    throw new Error(
      `Still missing indexes after creation: ${remainingIndexes.missing
        .map((i) => i.key)
        .join(', ')}`,
    );
  }

  // ── Verification ──────────────────────────────────────────────────────────
  if (wait) {
    try {
      const total = await verifyPlatformsQuery();
      logger.info(`✅ Query.contains("platforms", ["pc"]) works (${total} matching article(s)).`);
    } catch (error: unknown) {
      throw new Error(
        `Platforms query verification failed — the mobile feed would break: ${getErrorMessage(error)}`,
        { cause: error },
      );
    }
  } else {
    logger.info('⏭️ Skipping platform query verification (--no-wait).');
  }

  logger.info(
    `✅ All ${ARTICLE_SUMMARY_ATTRIBUTES.length} attributes are present` +
      (ARTICLE_SUMMARY_INDEXES.length > 0
        ? ` and ${ARTICLE_SUMMARY_INDEXES.length} index(es) are available.`
        : ' (no additional indexes required).'),
  );
}

main()
  .then(() => setTimeout(() => process.exit(0), 250))
  .catch((error) => {
    logger.error(error, 'Fatal Error');
    setTimeout(() => process.exit(1), 250);
  });
