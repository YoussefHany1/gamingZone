import { logger } from '../../lib/logger';
import * as sdk from 'node-appwrite';

import { loadBackendEnv } from '../../lib/env';
import { env, getAiProviderConfig, getCerebrasModels, getGroqModels } from '../../lib/config';
import { createAppwriteDatabases } from '../../lib/appwrite';
import { getErrorMessage } from '../../lib/errors';
import { createAiRuntime } from '../../lib/ai';
import type { AiRuntime } from '../../lib/ai';
import { formatAiChain } from '../../lib/ai.shared';

import {
  BACKFILL_CONCURRENCY,
  BACKFILL_MAX_ARTICLES_PER_MINUTE,
  BACKFILL_NEWEST,
  BACKFILL_OLDEST,
  LANGUAGE_TO_ATTRIBUTE,
  LANGUAGE_TO_JSON_KEY,
  MAX_ATTEMPTS,
  MAX_BACKFILL_MS,
  SUMMARY_LANGUAGES,
  articleSummaryChain,
  buildPendingQueueQuery,
  buildPrompt,
  cleanSummary,
  pacingDelayMs,
  parseSummaries,
  pendingSummaryFilters,
  sanitizeQueueLimit,
} from './articleSummary.shared';
import type { SummarizableArticle, SummaryMap } from './articleSummary.shared';

loadBackendEnv();

const DATABASE_ID = env.APPWRITE_DATABASE_ID;
const ARTICLES_COLLECTION_ID = env.ARTICLES_COLLECTION_ID;

const databases = createAppwriteDatabases();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface BackfillStats {
  processed: number;
  succeeded: number;
  failed: number;
  complete: boolean;
}

export interface BackfillOptions {
  /** Override the newest-first queue size (default `BACKFILL_NEWEST`). */
  newest?: number;
  /** Override the oldest-first queue size (default `BACKFILL_OLDEST`). */
  oldest?: number;
  /** Wall-clock budget in ms (default `MAX_BACKFILL_MS`). */
  maxDurationMs?: number;
}

/**
 * Generates the 7-language summary JSON via the model fallback chain (see
 * `lib/ai`). Returns the parsed map; validation/cleaning happens in
 * `parseSummaries`, so a partial response is still usable.
 *
 * The per-task chain (flash-lite first) comes from `articleSummaryChain`, so
 * this high-volume job keeps its cheap-primary cost profile regardless of the
 * shared `AI_CHAIN`/default chain.
 */
async function generateSummaries(prompt: string, ai: AiRuntime): Promise<SummaryMap> {
  const { provider, model, text } = await ai.generate({
    prompt,
    label: 'article summary',
    chain: articleSummaryChain(getGroqModels(), getCerebrasModels()),
    geminiSchema: {
      type: 'OBJECT',
      properties: Object.fromEntries(
        Object.values(LANGUAGE_TO_JSON_KEY).map((key) => [key, { type: 'STRING' }]),
      ),
    },
    temperature: 0.4,
  });

  logger.info(`🤖 Article summary generated via ${provider}/${model}.`);
  return parseSummaries(text);
}
/**
 * Generates and stores the summaries for one article.
 *
 * The attempt counter is written *first* so a crash mid-run is still counted on
 * the next backfill pass. Success (`summaries_at`) and give-up
 * (`summaries_failed`) are deliberately distinct states so a failed article is
 * never mistaken for a summarized one. Never throws.
 */
async function enrichArticleWithSummaries(
  article: SummarizableArticle,
  ai: AiRuntime,
): Promise<boolean> {
  const attempts = (article.summaries_attempts ?? 0) + 1;

  try {
    await databases.updateDocument(DATABASE_ID, ARTICLES_COLLECTION_ID, article.$id, {
      summaries_attempts: attempts,
    });
  } catch (error: unknown) {
    logger.warn(`⚠️ Could not bump summary attempts for ${article.$id}: ${getErrorMessage(error)}`);
  }

  try {
    const summaries = await generateSummaries(buildPrompt(article), ai);

    const payload: Record<string, unknown> = { summaries_attempts: attempts };
    let found = 0;
    for (const language of SUMMARY_LANGUAGES) {
      const value = summaries[language];
      if (!value) continue;
      payload[LANGUAGE_TO_ATTRIBUTE[language]] = value;
      found++;
    }

    const complete = found === SUMMARY_LANGUAGES.length;
    if (complete) {
      payload.summaries_at = new Date().toISOString();
      payload.summaries_failed = false;
    } else if (attempts >= MAX_ATTEMPTS) {
      payload.summaries_failed = true;
    }

    await databases.updateDocument(DATABASE_ID, ARTICLES_COLLECTION_ID, article.$id, payload);

    if (complete) {
      logger.info(
        `✅ Summarized ${article.$id} in ${found}/${SUMMARY_LANGUAGES.length} languages.`,
      );
    } else {
      logger.warn(
        `⚠️ Partial summary for ${article.$id}: ${found}/${SUMMARY_LANGUAGES.length} languages.`,
      );
    }

    return complete;
  } catch (error: unknown) {
    logger.warn(`⚠️ Summary generation failed for ${article.$id}: ${getErrorMessage(error)}`);

    if (attempts >= MAX_ATTEMPTS) {
      try {
        await databases.updateDocument(DATABASE_ID, ARTICLES_COLLECTION_ID, article.$id, {
          summaries_attempts: attempts,
          summaries_failed: true,
        });
      } catch (updateError: unknown) {
        logger.warn(
          `⚠️ Could not mark ${article.$id} as summary-failed: ${getErrorMessage(updateError)}`,
        );
      }
    }

    return false;
  }
}

async function listPending(order: 'desc' | 'asc', limit: number): Promise<sdk.Models.Document[]> {
  // `limit <= 0` (e.g. the `--limit N` smoke path sets `oldest: 0`) means
  // "skip this queue". Appwrite rejects `Query.limit(0)`, so we never build the
  // query at all rather than passing an invalid value.
  const queue = buildPendingQueueQuery(order, limit);
  if (!queue) {
    logger.info(
      `💤 Skipping the ${order === 'desc' ? 'newest' : 'oldest'} pending queue (limit ${limit}).`,
    );
    return [];
  }

  const response = await databases.listDocuments(DATABASE_ID, ARTICLES_COLLECTION_ID, [
    ...pendingSummaryFilters(),
    queue.order === 'desc' ? sdk.Query.orderDesc('pubDate') : sdk.Query.orderAsc('pubDate'),
    sdk.Query.limit(queue.limit),
  ]);

  return response.documents;
}

/**
 * Backfill pass: summarizes articles that are still pending, newest first (so
 * fresh/recently-missed articles are covered) plus a slice of the oldest (so the
 * historical backlog always converges even under steady ingestion).
 *
 * Newly created articles are picked up here in the same cron invocation, right
 * after the RSS job — no inline work is added to the ingestion path.
 *
 * `options` exists so an operator can run a cheap, bounded pass (e.g. a staging
 * smoke test with `--limit 2`) without changing the production batch sizes.
 */
async function runBackfillArticleSummaries(options: BackfillOptions = {}): Promise<BackfillStats> {
  const stats: BackfillStats = { processed: 0, succeeded: 0, failed: 0, complete: true };
  const newestLimit = sanitizeQueueLimit(options.newest, BACKFILL_NEWEST);
  const oldestLimit = sanitizeQueueLimit(options.oldest, BACKFILL_OLDEST);
  const maxDurationMs = options.maxDurationMs ?? MAX_BACKFILL_MS;

  // One runtime per run: the backfill makes hundreds of AI calls below, and
  // all of them share the memory of quota-exhausted models (a model that
  // failed over on quota is skipped on every later call instead of costing
  // one wasted 429 round-trip per article).
  const ai = createAiRuntime(getAiProviderConfig(), { log: logger });

  let newest: sdk.Models.Document[] = [];
  let oldest: sdk.Models.Document[] = [];

  try {
    [newest, oldest] = await Promise.all([
      listPending('desc', newestLimit),
      listPending('asc', oldestLimit),
    ]);
  } catch (error: unknown) {
    logger.error(`❌ Could not load pending articles for summaries: ${getErrorMessage(error)}`);
    stats.complete = false;
    return stats;
  }

  // Dedup across the two queues: with fewer than BACKFILL_NEWEST + BACKFILL_OLDEST
  // pending docs, the queries overlap and a doc would otherwise burn two of its
  // attempts in a single run. Insertion order (newest first) is preserved.
  const unique = [...new Map([...newest, ...oldest].map((doc) => [doc.$id, doc])).values()];

  if (unique.length === 0) {
    logger.info('💤 No articles pending an AI summary.');
    return stats;
  }

  logger.info(
    `🧠 Generating summaries for ${unique.length} article(s) — chain: ${formatAiChain(articleSummaryChain(getGroqModels(), getCerebrasModels()))}...`,
  );
  const deadline = Date.now() + maxDurationMs;

  for (let i = 0; i < unique.length; i += BACKFILL_CONCURRENCY) {
    // Checked before dispatching a batch (never mid-batch) so every started
    // article always runs to completion. Unprocessed docs stay pending for the
    // next tick.
    if (Date.now() >= deadline) {
      logger.warn(
        `⏱️ Summary backfill hit its ${maxDurationMs / 1000}s deadline; remaining articles deferred.`,
      );
      stats.complete = false;
      break;
    }

    const batch = unique.slice(i, i + BACKFILL_CONCURRENCY);
    const batchStartedAt = Date.now();
    const results = await Promise.allSettled(
      batch.map((doc) => enrichArticleWithSummaries(doc as unknown as SummarizableArticle, ai)),
    );

    results.forEach((result, index) => {
      stats.processed++;
      if (result.status === 'fulfilled' && result.value) {
        stats.succeeded++;
      } else {
        stats.failed++;
        if (result.status === 'rejected') {
          logger.warn(
            `⚠️ Unexpected summary rejection for ${batch[index]?.$id}: ${getErrorMessage(result.reason)}`,
          );
        }
      }
    });

    // Pace the next batch so the long-run rate never exceeds Gemini's per-minute
    // quota (one request per article). Skipped after the final batch, and when
    // the wait would only push us through the deadline.
    const isLastBatch = i + BACKFILL_CONCURRENCY >= unique.length;
    if (!isLastBatch) {
      const delayMs = pacingDelayMs(
        batch.length,
        Date.now() - batchStartedAt,
        BACKFILL_MAX_ARTICLES_PER_MINUTE,
      );

      if (delayMs > 0) {
        if (Date.now() + delayMs >= deadline) {
          logger.warn(
            `⏱️ No time left to pace the next summary batch within ${maxDurationMs / 1000}s; remaining articles deferred.`,
          );
          stats.complete = false;
          break;
        }

        logger.info(
          `⏳ Pacing summaries: waiting ${(delayMs / 1000).toFixed(1)}s to stay under ${BACKFILL_MAX_ARTICLES_PER_MINUTE}/min...`,
        );
        await sleep(delayMs);
      }
    }
  }

  logger.info(
    `🧠 Summary backfill done — processed: ${stats.processed}, complete: ${stats.succeeded}, incomplete: ${stats.failed}`,
  );
  return stats;
}

export {
  runBackfillArticleSummaries,
  enrichArticleWithSummaries,
  // Re-exported for convenience; the canonical definitions live in the shared
  // (pure) module so they can be unit tested without env/Appwrite.
  parseSummaries,
  cleanSummary,
  SUMMARY_LANGUAGES,
  LANGUAGE_TO_ATTRIBUTE,
  LANGUAGE_TO_JSON_KEY,
};
