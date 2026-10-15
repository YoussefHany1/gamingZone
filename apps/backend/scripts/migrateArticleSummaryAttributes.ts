import { logger } from './lib/logger';
import { loadBackendEnv } from './lib/env';
import { env } from './lib/config';
import { createAppwriteDatabases } from './lib/appwrite';
import { getErrorMessage } from './lib/errors';
import {
  ARTICLE_SUMMARY_ATTRIBUTES,
  diffArticleSummaryAttributes,
} from './features/summary/articleSummaryAttributes';
import type {
  DesiredAttribute,
  ExistingAttribute,
} from './features/summary/articleSummaryAttributes';

// Idempotently ensures the `articles` collection has every attribute the AI
// summary feature needs. Safe to re-run: it creates only the attributes that
// are absent and reports (never alters) any that already exist with a different
// shape.
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

const WAIT_TIMEOUT_MS = 60_000;
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
    default: value.default,
    status: typeof value.status === 'string' ? value.status : undefined,
  };
}

async function listExistingAttributes(): Promise<ExistingAttribute[]> {
  const collection = await databases.getCollection(DATABASE_ID, COLLECTION_ID);
  const attributes = (collection as unknown as { attributes?: unknown[] }).attributes ?? [];
  return attributes.map(normalizeAttribute);
}

async function createAttribute(attribute: DesiredAttribute): Promise<void> {
  const { key, type, required, size, min, max, xdefault } = attribute;

  switch (type) {
    case 'string':
      await databases.createStringAttribute(
        DATABASE_ID,
        COLLECTION_ID,
        key,
        size ?? 500,
        required,
        xdefault as string | undefined,
      );
      return;
    case 'datetime':
      await databases.createDatetimeAttribute(
        DATABASE_ID,
        COLLECTION_ID,
        key,
        required,
        xdefault as string | undefined,
      );
      return;
    case 'integer':
      await databases.createIntegerAttribute(
        DATABASE_ID,
        COLLECTION_ID,
        key,
        required,
        min,
        max,
        xdefault as number | undefined,
      );
      return;
    case 'boolean':
      await databases.createBooleanAttribute(
        DATABASE_ID,
        COLLECTION_ID,
        key,
        required,
        xdefault as boolean | undefined,
      );
      return;
  }
}

async function waitUntilAvailable(keys: string[], timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  for (;;) {
    const attributes = await listExistingAttributes();
    const byKey = new Map(attributes.map((attribute) => [attribute.key, attribute]));
    const pending = keys.filter((key) => byKey.get(key)?.status !== 'available');

    if (pending.length === 0) return;

    if (Date.now() >= deadline) {
      throw new Error(
        `Timed out waiting for attributes to become available: ${pending.join(', ')}`,
      );
    }

    await delay(POLL_INTERVAL_MS);
  }
}

async function main(): Promise<void> {
  const dryRun = hasFlag('--dry-run');
  const wait = !hasFlag('--no-wait');

  logger.info(
    `🔎 Checking ${ARTICLE_SUMMARY_ATTRIBUTES.length} summary attributes on ${DATABASE_ID}/${COLLECTION_ID}...`,
  );

  const existing = await listExistingAttributes();
  const diff = diffArticleSummaryAttributes(existing);

  logger.info(
    `   ${diff.matched.length} matched · ${diff.missing.length} missing · ${diff.mismatched.length} mismatched`,
  );

  if (diff.missing.length > 0) {
    logger.info(`   missing: ${diff.missing.map((attribute) => attribute.key).join(', ')}`);
  }

  for (const item of diff.mismatched) {
    logger.warn(
      `   ⚠️ "${item.desired.key}" exists but differs (${item.reasons.join('; ')}) — not altering it.`,
    );
  }

  if (diff.missing.length === 0) {
    logger.info('✅ Nothing to do — all summary attributes already exist.');
    return;
  }

  if (dryRun) {
    logger.info('🧪 Dry run — no attributes were created.');
    return;
  }

  for (const attribute of diff.missing) {
    try {
      await createAttribute(attribute);
      logger.info(`➕ Created "${attribute.key}" (${attribute.type}).`);
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      // Already-existing (409/conflict) is fine — another run/operator won the race.
      if (/already exists|conflict|\b409\b/i.test(message)) {
        logger.info(`   "${attribute.key}" already exists — skipping.`);
        continue;
      }
      throw new Error(`Failed to create attribute "${attribute.key}": ${message}`);
    }
  }

  if (wait) {
    logger.info('⏳ Waiting for Appwrite to finish creating the attributes...');
    await waitUntilAvailable(
      diff.missing.map((attribute) => attribute.key),
      WAIT_TIMEOUT_MS,
    );
  }

  const remaining = diffArticleSummaryAttributes(await listExistingAttributes());
  if (remaining.missing.length > 0) {
    throw new Error(
      `Still missing after creation: ${remaining.missing.map((a) => a.key).join(', ')}`,
    );
  }

  logger.info(`✅ All ${ARTICLE_SUMMARY_ATTRIBUTES.length} summary attributes are present.`);
}

main()
  .then(() => setTimeout(() => process.exit(0), 250))
  .catch((error) => {
    logger.error(error, 'Fatal Error');
    setTimeout(() => process.exit(1), 250);
  });
