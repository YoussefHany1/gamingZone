import { logger } from '../../lib/logger';
import * as sdk from 'node-appwrite';

import { loadBackendEnv } from '../../lib/env';
import { env, requireGeminiKey } from '../../lib/config';
import { createAppwriteDatabases } from '../../lib/appwrite';
import { getErrorMessage } from '../../lib/errors';

import {
  BACKFILL_CONCURRENCY,
  BACKFILL_NEWEST,
  BACKFILL_OLDEST,
  GEMINI_TIMEOUT_MS,
  LANGUAGE_TO_ATTRIBUTE,
  LANGUAGE_TO_JSON_KEY,
  MAX_ATTEMPTS,
  MAX_BACKFILL_MS,
  MAX_GEMINI_RETRIES,
  MODEL,
  SUMMARY_LANGUAGES,
  buildPendingQueueQuery,
  buildPrompt,
  cleanSummary,
  parseSummaries,
  pendingSummaryFilters,
  sanitizeQueueLimit,
} from './articleSummary.shared';
import type { SummarizableArticle, SummaryMap } from './articleSummary.shared';

loadBackendEnv();

const DATABASE_ID = env.APPWRITE_DATABASE_ID;
const ARTICLES_COLLECTION_ID = env.ARTICLES_COLLECTION_ID;

const databases = createAppwriteDatabases();

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

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function callGemini(prompt: string): Promise<SummaryMap> {
  const apiKey = requireGeminiKey();
  let attempt = 0;

  while (true) {
    attempt++;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

    try {
      logger.info(
        `🤖 Article summary: trying Gemini (attempt ${attempt}/${MAX_GEMINI_RETRIES})...`,
      );

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.4,
              response_mime_type: 'application/json',
              // Intentionally omitting `required`: a single missing language
              // must not invalidate an otherwise usable response.
              responseSchema: {
                type: 'OBJECT',
                properties: Object.fromEntries(
                  Object.values(LANGUAGE_TO_JSON_KEY).map((key) => [key, { type: 'STRING' }]),
                ),
              },
            },
          }),
        },
      );

      const aiData = await response.json();

      if (aiData.error) {
        throw new Error(`Gemini API Error: ${JSON.stringify(aiData.error)}`);
      }

      const rawText = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error(`Gemini returned no text: ${JSON.stringify(aiData).substring(0, 200)}`);
      }

      return parseSummaries(rawText);
    } catch (error: unknown) {
      logger.warn(`⚠️ Article summary attempt ${attempt} failed: ${getErrorMessage(error)}`);
      if (attempt >= MAX_GEMINI_RETRIES) throw error;

      const backoffTime = Math.pow(2, attempt) * 1000;
      await delay(backoffTime);
    } finally {
      clearTimeout(timer);
    }
  }
}

/**
 * Generates and stores the summaries for one article.
 *
 * The attempt counter is written *first* so a crash mid-run is still counted on
 * the next backfill pass. Success (`summaries_at`) and give-up
 * (`summaries_failed`) are deliberately distinct states so a failed article is
 * never mistaken for a summarized one. Never throws.
 */
async function enrichArticleWithSummaries(article: SummarizableArticle): Promise<boolean> {
  const attempts = (article.summaries_attempts ?? 0) + 1;

  try {
    await databases.updateDocument(DATABASE_ID, ARTICLES_COLLECTION_ID, article.$id, {
      summaries_attempts: attempts,
    });
  } catch (error: unknown) {
    logger.warn(`⚠️ Could not bump summary attempts for ${article.$id}: ${getErrorMessage(error)}`);
  }

  try {
    const summaries = await callGemini(buildPrompt(article));

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

  logger.info(`🧠 Generating summaries for ${unique.length} article(s)...`);
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
    const results = await Promise.allSettled(
      batch.map((doc) => enrichArticleWithSummaries(doc as unknown as SummarizableArticle)),
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
