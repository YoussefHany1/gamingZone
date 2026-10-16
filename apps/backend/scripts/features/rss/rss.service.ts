import { logger } from '../../lib/logger';
import { Query } from 'node-appwrite';

import { loadBackendEnv } from '../../lib/env';
import { env } from '../../lib/config';
import { createAppwriteDatabases } from '../../lib/appwrite';
import { initFirebaseAdmin } from '../../lib/firebaseAdmin';
import { sha1Id } from '../../lib/hash';
import { getErrorMessage } from '../../lib/errors';
import { ANDROID_CHANNEL_ID, buildTopicPush, sendTopicPush } from '../../lib/fcm';

import { safeId, resolveImageUrl } from './helpers';
import { fetchFeed, fetchArticleData } from './fetch';
import { normalizeItems, NormalizedArticle, FetchedContent } from './normalize';

loadBackendEnv();

const CONFIG = {
  COLLECTION_RSS: env.RSS_COLLECTION_ID,
  COLLECTION_ARTICLES: env.ARTICLES_COLLECTION_ID,
  MAX_CONCURRENCY: 3,
  MAX_STORED_NEWS: 50,
  RECENT_IDS_LIMIT: 100,
  AXIOS_TIMEOUT: 30000,
  APPWRITE_DATABASE_ID: env.APPWRITE_DATABASE_ID,
};

const databases = createAppwriteDatabases();
const firebaseState = initFirebaseAdmin('rss');

if (firebaseState.enabled) {
  logger.info('✅ Firebase Admin initialized.');
} else if (firebaseState.error) {
  logger.warn(`⚠️ Firebase error: ${firebaseState.error}`);
}

/**
 * New articles downloaded and parsed per source. Deliberately low: every
 * article costs a full page fetch plus a JSDOM + Readability parse, and the
 * Appwrite runtime only has 512 MB, so this is the main memory lever.
 */
const DEFAULT_ARTICLE_BATCH_SIZE = 3;

/**
 * Optional knobs. Every field defaults to the original behaviour, so the
 * scheduled tick is unaffected; they exist so a single deployed build can be
 * bisected via the request body while diagnosing a hard failure (a run that
 * dies too early to write logs still returns its summary when it survives).
 */
export interface RunFetchRssOptions {
  /** Process at most this many sources. */
  maxSources?: number;
  /** Skip the first N sources (pairs with maxSources to slice a range). */
  offset?: number;
  /** Fetch + normalize feeds only: no article fetches, no writes, no pushes. */
  fetchOnly?: boolean;
  /** Sources processed concurrently (default 3). */
  concurrency?: number;
  /** Articles created concurrently within one source (default `DEFAULT_ARTICLE_BATCH_SIZE`). */
  articleBatchSize?: number;
  /** Send FCM notifications for new articles (default true). */
  notify?: boolean;
  /** Delete articles beyond MAX_STORED_NEWS (default true). */
  cleanup?: boolean;
}

interface RssSummary {
  notificationsSent: number;
  errors: { name: string; msg: string }[];
  sourcesProcessed: number;
  newArticles: number;
  peakRssMb: number;
  peakHeapMb: number;
}

/**
 * Samples process memory on a timer so the peak is reported even though the
 * heavy work happens inside awaited promises. Kept short on purpose: a hard
 * kill leaves no chance to read memory after the fact.
 */
function createMemorySampler(): { stop: () => { peakRssMb: number; peakHeapMb: number } } {
  let peakRss = process.memoryUsage().rss;
  let peakHeap = process.memoryUsage().heapUsed;

  const timer = setInterval(() => {
    const usage = process.memoryUsage();
    if (usage.rss > peakRss) peakRss = usage.rss;
    if (usage.heapUsed > peakHeap) peakHeap = usage.heapUsed;
  }, 1000);
  timer.unref();

  return {
    stop: () => {
      clearInterval(timer);
      const usage = process.memoryUsage();
      if (usage.rss > peakRss) peakRss = usage.rss;
      if (usage.heapUsed > peakHeap) peakHeap = usage.heapUsed;
      return {
        peakRssMb: Math.round(peakRss / 1048576),
        peakHeapMb: Math.round(peakHeap / 1048576),
      };
    },
  };
}

interface SourceData {
  rssUrl: string;
  category: string;
  name: string;
  docId: string;
  raw: Record<string, unknown>;
}

type SaveResult = 'created' | 'exists' | 'skipped' | 'failed';

function getErrorCode(error: unknown): unknown {
  if (error && typeof error === 'object' && 'code' in error) {
    return (error as { code?: unknown }).code;
  }
  return undefined;
}

function getStringValue(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null;
}

async function sendNotifications(
  articles: (NormalizedArticle & { topicName: string })[],
  summary: RssSummary,
): Promise<void> {
  if (!articles.length) return;

  logger.info(`🔔 Sending ${articles.length} notifications...`);
  const BATCH_SIZE = 10;

  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    const chunk = articles.slice(i, i + BATCH_SIZE);

    await Promise.allSettled(
      chunk.map(async (article) => {
        const imageLink = article.thumbnail || '';

        const { ok, error } = await sendTopicPush(
          firebaseState,
          buildTopicPush({
            topic: article.topicName,
            title: article.title.substring(0, 150),
            body: article.description.substring(0, 150),
            image: imageLink,
            channelId: ANDROID_CHANNEL_ID.NEWS,
            data: {
              link: article.link || '',
              image: imageLink,
            },
          }),
        );

        if (ok) {
          summary.notificationsSent++;
          logger.info(`   -> Sent: ${article.title.substring(0, 30)}...`);
        } else if (error) {
          logger.error(`   -> Failed: ${getErrorMessage(error)}`);
        }
      }),
    );
  }
}

function serializePubDate(value: Date | string | null | undefined): string | null {
  const date = value instanceof Date ? value : typeof value === 'string' ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return null;

  return date.toISOString();
}

/**
 * True when the article is already stored. Consulted *before* the page fetch:
 * feeds regularly return more items than `recentIds` remembers (it caches the
 * newest 100), so without this check the same articles are re-downloaded and
 * re-parsed on every single run until the write is rejected with a 409. That
 * wasted work grows as feeds grow and is what pushed the run into OOM.
 */
async function articleExists(item: NormalizedArticle): Promise<boolean> {
  const ids = [item.docId, item.legacyDocId].filter((id): id is string => Boolean(id));

  for (const id of ids) {
    try {
      await databases.getDocument(CONFIG.APPWRITE_DATABASE_ID, CONFIG.COLLECTION_ARTICLES, id);
      return true;
    } catch (error: unknown) {
      if (getErrorCode(error) === 404) continue;
      // Fail open: an unexpected lookup error must never drop a new article.
      logger.warn(`      ⚠️ Existence check failed for ${id}: ${getErrorMessage(error)}`);
      return false;
    }
  }

  return false;
}

async function createArticle(sourceData: SourceData, item: NormalizedArticle): Promise<SaveResult> {
  if (await articleExists(item)) return 'skipped';

  let fullDescription: string | null = null;

  logger.info(`      📄 Fetching Article Data for: "${item.title.substring(0, 20)}..."`);

  try {
    const articleData = await fetchArticleData(item.link);
    if (articleData) {
      if (!item.thumbnail && articleData.imageUrl) {
        item.thumbnail = resolveImageUrl(articleData.imageUrl, item.link);
        logger.info('      ✅ Image found!');
      }
      if (articleData.fullDescription) fullDescription = articleData.fullDescription;
    }
  } catch (error: unknown) {
    logger.warn(`      ⚠️ Article enrichment failed for ${item.link}: ${getErrorMessage(error)}`);
  }

  const pubDate = serializePubDate(item.pubDate);
  if (!pubDate) logger.warn(`      ⚠️ No valid publication date for ${item.link}`);

  const payload = {
    title: item.title,
    link: item.link,
    description: fullDescription || item.description,
    pubDate,
    thumbnail: item.thumbnail || null,
    guid: String(item.guid || item.link),
    fetchedAt: new Date().toISOString(),
    siteName: sourceData.name,
    category: sourceData.category,
    siteImage: sourceData.raw?.image || null,
    language: sourceData.raw?.language || null,
  };

  try {
    await databases.createDocument(
      CONFIG.APPWRITE_DATABASE_ID,
      CONFIG.COLLECTION_ARTICLES,
      item.docId as string,
      payload,
    );
    return 'created';
  } catch (error: unknown) {
    if (getErrorCode(error) === 409) {
      try {
        const existing = await databases.getDocument(
          CONFIG.APPWRITE_DATABASE_ID,
          CONFIG.COLLECTION_ARTICLES,
          item.docId as string,
        );
        if (existing.link === item.link || existing.guid === item.guid) return 'exists';
      } catch (lookupError: unknown) {
        logger.warn(`      ⚠️ Could not verify existing article: ${getErrorMessage(lookupError)}`);
      }
    } else {
      logger.error(`      ❌ Save failed: ${getErrorMessage(error)}`);
    }

    return 'failed';
  }
}

async function cleanupOldArticles(siteName: string, category: string): Promise<void> {
  try {
    const excessDocs = await databases.listDocuments(
      CONFIG.APPWRITE_DATABASE_ID,
      CONFIG.COLLECTION_ARTICLES,
      [
        Query.equal('siteName', siteName),
        Query.equal('category', category),
        Query.orderDesc('fetchedAt'),
        Query.limit(50),
        Query.offset(CONFIG.MAX_STORED_NEWS),
      ],
    );

    if (!excessDocs.documents.length) return;

    logger.info(
      `      🧹 Cleanup: Deleting ${excessDocs.documents.length} old articles for ${siteName}...`,
    );

    const BATCH_SIZE = 10;
    for (let i = 0; i < excessDocs.documents.length; i += BATCH_SIZE) {
      const chunk = excessDocs.documents.slice(i, i + BATCH_SIZE);
      await Promise.allSettled(
        chunk.map((doc) =>
          databases.deleteDocument(
            CONFIG.APPWRITE_DATABASE_ID,
            CONFIG.COLLECTION_ARTICLES,
            doc.$id,
          ),
        ),
      );
    }
  } catch (error: unknown) {
    logger.error(`      ⚠️ Cleanup failed: ${getErrorMessage(error)}`);
  }
}

async function processSource(
  sourceData: SourceData,
  summary: RssSummary,
  options: RunFetchRssOptions = {},
): Promise<void> {
  const { rssUrl, category, name, docId, raw } = sourceData;
  const topicName = `${safeId(category)}_${safeId(name)}`;

  try {
    logger.info(`📥 Processing: ${name}`);
    const cacheHeaders = {
      etag: getStringValue(raw.lastEtag),
      lastModified: getStringValue(raw.lastModified),
    };
    const fetched: FetchedContent = await fetchFeed(rssUrl, CONFIG.AXIOS_TIMEOUT, cacheHeaders);
    const fetchedAt = new Date().toISOString();

    if (!fetched.isModified) {
      await databases.updateDocument(CONFIG.APPWRITE_DATABASE_ID, CONFIG.COLLECTION_RSS, docId, {
        lastFetchedAt: fetchedAt,
      });
      return;
    }

    let items = normalizeItems(fetched, rssUrl, docId);
    if (name.toLowerCase().includes('techpowerup') || rssUrl.includes('techpowerup')) {
      items = items.map((item) => ({
        ...item,
        legacyDocId: sha1Id(item.title.trim().toLowerCase()),
      }));
    }

    if (!items.length) {
      logger.info('   ⚠️ No valid items found after normalization.');
      await databases.updateDocument(CONFIG.APPWRITE_DATABASE_ID, CONFIG.COLLECTION_RSS, docId, {
        lastFetchedAt: fetchedAt,
        latestTitles: Array.isArray(raw.latestTitles) ? raw.latestTitles : [],
        recentIds: Array.isArray(raw.recentIds) ? raw.recentIds : [],
        ...(fetched.etag ? { lastEtag: fetched.etag } : {}),
        ...(fetched.lastModified ? { lastModified: fetched.lastModified } : {}),
      });
      return;
    }

    const uniqueMap = new Map<string, NormalizedArticle>();
    items.forEach((item) => {
      if (item.docId) uniqueMap.set(item.docId, item);
    });
    items = Array.from(uniqueMap.values());

    const existingIds = new Set<string>(
      Array.isArray(raw.recentIds)
        ? raw.recentIds.filter((id: unknown): id is string => typeof id === 'string')
        : [],
    );
    const isKnownItem = (item: NormalizedArticle): boolean =>
      Boolean(item.docId && existingIds.has(item.docId)) ||
      Boolean(item.legacyDocId && existingIds.has(item.legacyDocId));
    const confirmedDocIds = new Set(existingIds);
    const newItems = items.filter((item) => {
      const known = isKnownItem(item);
      if (known && item.docId) confirmedDocIds.add(item.docId);
      return !known;
    });

    logger.info(
      `   🔍 Total items: ${items.length}, Unique docIds: ${new Set(items.map((item) => item.docId)).size}, New: ${newItems.length}`,
    );

    if (items.length > 0 && new Set(items.map((item) => item.docId)).size === 1) {
      logger.info(
        `   ⚠️ WARNING: All items have same docId! Sample: ${JSON.stringify(items[0]).substring(0, 200)}`,
      );
    }

    if (options.fetchOnly) {
      summary.newArticles += newItems.length;
      logger.info('   🔬 fetchOnly: skipping article writes, notifications and cleanup.');
      return;
    }

    const createdItems: NormalizedArticle[] = [];
    let skipped = 0;

    if (newItems.length > 0) {
      const BATCH_SIZE = options.articleBatchSize ?? DEFAULT_ARTICLE_BATCH_SIZE;
      for (let i = 0; i < newItems.length; i += BATCH_SIZE) {
        const chunk = newItems.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(
          chunk.map((item) => createArticle(sourceData, item)),
        );

        results.forEach((result, index) => {
          const item = chunk[index];
          if (result.status === 'fulfilled') {
            if (result.value === 'skipped') {
              skipped++;
              confirmedDocIds.add(item.docId as string);
              return;
            }
            if (result.value === 'created' || result.value === 'exists') {
              confirmedDocIds.add(item.docId as string);
            }
            if (result.value === 'created') createdItems.push(item);
            return;
          }

          const message = getErrorMessage(result.reason);
          logger.error(`      ❌ Save failed for ${item.title}: ${message}`);
          summary.errors.push({ name, msg: message });
        });
      }

      if (skipped > 0) {
        logger.info(
          `      💤 Already stored, no page fetch: ${skipped} of ${newItems.length} candidate(s).`,
        );
      }
    }

    const confirmedItems = items.filter((item) => item.docId && confirmedDocIds.has(item.docId));
    const storedTitles = Array.isArray(raw.latestTitles)
      ? raw.latestTitles.filter((title: unknown): title is string => typeof title === 'string')
      : [];
    const finalTitles = [...confirmedItems.map((item) => item.title), ...storedTitles].slice(
      0,
      CONFIG.MAX_STORED_NEWS,
    );
    const orderedIds = items
      .map((item) => item.docId)
      .filter((id): id is string => Boolean(id && confirmedDocIds.has(id)));
    const updatedRecentIds = Array.from(new Set([...orderedIds, ...existingIds])).slice(
      0,
      CONFIG.RECENT_IDS_LIMIT,
    );

    await databases.updateDocument(CONFIG.APPWRITE_DATABASE_ID, CONFIG.COLLECTION_RSS, docId, {
      lastFetchedAt: fetchedAt,
      latestTitles: finalTitles,
      recentIds: updatedRecentIds,
      ...(fetched.etag ? { lastEtag: fetched.etag } : {}),
      ...(fetched.lastModified ? { lastModified: fetched.lastModified } : {}),
    });

    summary.newArticles += createdItems.length;

    if (createdItems.length > 0) {
      logger.info(`   🚀 Saved and queued ${createdItems.length} new articles.`);
      if (options.notify !== false) {
        await sendNotifications(
          createdItems.map((item) => ({ ...item, topicName })),
          summary,
        );
      }
    } else {
      logger.info('   💤 No new articles persisted.');
    }

    if (options.cleanup !== false) {
      await cleanupOldArticles(name, category);
    }
  } catch (error: unknown) {
    logger.error(`❌ Error in ${name}: ${getErrorMessage(error)}`);
    summary.errors.push({ name, msg: getErrorMessage(error) });
  } finally {
    summary.sourcesProcessed++;
  }
}

async function runFetchRss(options: RunFetchRssOptions = {}): Promise<RssSummary> {
  logger.info('🚀 Starting Unified Fetcher (API & RSS)...');
  const summary: RssSummary = {
    notificationsSent: 0,
    errors: [],
    sourcesProcessed: 0,
    newArticles: 0,
    peakRssMb: 0,
    peakHeapMb: 0,
  };
  const sampler = createMemorySampler();

  try {
    const res = await databases.listDocuments(CONFIG.APPWRITE_DATABASE_ID, CONFIG.COLLECTION_RSS, [
      Query.limit(1000),
    ]);

    const allSources: SourceData[] = res.documents.map((doc) => ({
      docId: doc.$id,
      rssUrl: doc.rssUrl,
      name: doc.name,
      category: doc.category,
      raw: doc as unknown as Record<string, unknown>,
    }));

    const offset = Math.max(0, options.offset ?? 0);
    const take = options.maxSources ?? allSources.length - offset;
    const sources = allSources.slice(offset, offset + Math.max(0, take));
    const concurrency = Math.max(1, options.concurrency ?? CONFIG.MAX_CONCURRENCY);

    logger.info(
      `Found ${allSources.length} sources. Running ${sources.length} (offset ${offset}) at concurrency ${concurrency}` +
        `${options.fetchOnly ? ' [fetchOnly]' : ''}${options.notify === false ? ' [no-notify]' : ''}.`,
    );

    for (let i = 0; i < sources.length; i += concurrency) {
      const chunk = sources.slice(i, i + concurrency);
      await Promise.all(chunk.map((source) => processSource(source, summary, options)));
    }
  } catch (error: unknown) {
    logger.error(error, 'Fatal Error');
    throw error;
  } finally {
    Object.assign(summary, sampler.stop());
  }

  logger.info(
    `\n--- Done. Sent: ${summary.notificationsSent}, New: ${summary.newArticles}, Errors: ${summary.errors.length}, Peak RSS: ${summary.peakRssMb}MB / heap ${summary.peakHeapMb}MB ---`,
  );
  return summary;
}

// `createArticle` is exported for tests only: it is the single place that
// decides whether an article needs downloading.
export { runFetchRss, createArticle, DEFAULT_ARTICLE_BATCH_SIZE };
