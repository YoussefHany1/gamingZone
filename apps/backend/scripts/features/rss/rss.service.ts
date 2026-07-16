import { logger } from '../../lib/logger';
import { Query, Models } from 'node-appwrite';

import { loadBackendEnv } from '../../lib/env';
import { env } from '../../lib/config';
import { createAppwriteDatabases } from '../../lib/appwrite';
import { initFirebaseAdmin } from '../../lib/firebaseAdmin';
import { sha1Id } from '../../lib/hash';

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
const firebaseState = initFirebaseAdmin('FCM_SERVICE_ACCOUNT');

if (firebaseState.enabled) {
  logger.info('✅ Firebase Admin initialized.');
} else if (firebaseState.error) {
  logger.warn(`⚠️ Firebase error: ${firebaseState.error}`);
}

interface RssSummary {
  notificationsSent: number;
  errors: { name: string; msg: string }[];
}

interface SourceData {
  rssUrl: string;
  category: string;
  name: string;
  docId: string;
  raw: any;
}

async function sendNotifications(
  articles: (NormalizedArticle & { topicName: string })[],
  summary: RssSummary,
): Promise<void> {
  if (!articles.length || !firebaseState.enabled || !firebaseState.admin) return;

  logger.info(`🔔 Sending ${articles.length} notifications...`);
  const BATCH_SIZE = 10;

  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    const chunk = articles.slice(i, i + BATCH_SIZE);

    await Promise.allSettled(
      chunk.map(async (article) => {
        const imageLink = article.thumbnail || '';
        const message = {
          topic: article.topicName,
          notification: {
            title: article.title.substring(0, 150),
            body: article.description.substring(0, 150),
            ...(imageLink && { image: imageLink }),
          },
          android: {
            priority: 'high' as const,
            notification: {
              channelId: 'news_notifications',
              ...(imageLink && { image: imageLink }),
            },
          },
          data: {
            link: article.link || '',
            image: imageLink || '',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          },
        };

        try {
          await firebaseState.admin.messaging().send(message);
          summary.notificationsSent++;
          logger.info(`   -> Sent: ${article.title.substring(0, 30)}...`);
        } catch (error: any) {
          logger.error(`   -> Failed: ${error.message}`);
        }
      }),
    );
  }
}

async function createArticle(sourceData: SourceData, item: NormalizedArticle): Promise<void> {
  let fullDescription: string | null = null;

  logger.info(`      📄 Fetching Article Data for: "${item.title.substring(0, 20)}..."`);

  const articleData = await fetchArticleData(item.link);
  if (articleData) {
    if (!item.thumbnail && articleData.imageUrl) {
      item.thumbnail = resolveImageUrl(articleData.imageUrl, sourceData.rssUrl);
      logger.info('      ✅ Image found!');
    }
    if (articleData.fullDescription) {
      fullDescription = articleData.fullDescription;
    }
  }

  const finalDescription = fullDescription ? fullDescription : item.description;

  const payload = {
    title: item.title,
    link: item.link,
    description: finalDescription,
    pubDate: item.pubDate instanceof Date ? item.pubDate.toISOString() : new Date().toISOString(),
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
  } catch (error: any) {
    if (error.code !== 409) {
      logger.error(`      ❌ Save failed: ${error.message}`);
    }
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
  } catch (error: any) {
    logger.error(`      ⚠️ Cleanup failed: ${error.message}`);
  }
}

async function processSource(sourceData: SourceData, summary: RssSummary): Promise<void> {
  const { rssUrl, category, name, docId, raw } = sourceData;
  const topicName = `${safeId(category)}_${safeId(name)}`;

  try {
    logger.info(`📥 Processing: ${name}`);
    const cacheHeaders = {
      etag: raw.lastEtag || null,
      lastModified: raw.lastModified || null,
    };
    const fetched: FetchedContent = await fetchFeed(rssUrl, CONFIG.AXIOS_TIMEOUT, cacheHeaders);

    if (!fetched.isModified) {
      return;
    }

    let items = normalizeItems(fetched, rssUrl);

    if (name.toLowerCase().includes('techpowerup') || rssUrl.includes('techpowerup')) {
      items = items.map((item) => {
        const stableKey = (item.title || '').trim().toLowerCase();
        return { ...item, docId: sha1Id(stableKey) };
      });
    }

    if (!items.length) {
      logger.info('   ⚠️ No items found after normalization.');
      return;
    }

    const uniqueMap = new Map<string, NormalizedArticle>();
    items.forEach((item) => {
      if (item.docId) {
        uniqueMap.set(item.docId, item);
      }
    });
    items = Array.from(uniqueMap.values());

    const existingIds = new Set<string>(raw.recentIds || []);
    const newItems = items.filter((item) => item.docId && !existingIds.has(item.docId));

    logger.info(
      `   🔍 Total items: ${items.length}, Unique docIds: ${new Set(items.map((item) => item.docId)).size}, New: ${newItems.length}`,
    );

    if (items.length > 0 && new Set(items.map((item) => item.docId)).size === 1) {
      logger.info(
        `   ⚠️ WARNING: All items have same docId! Sample: ${JSON.stringify(items[0]).substring(0, 200)}`,
      );
    }

    const storedTitles: string[] = raw.latestTitles || [];
    const newTitles = newItems.map((item) => item.title);
    const finalTitles = [...newTitles, ...storedTitles].slice(0, CONFIG.MAX_STORED_NEWS);

    const allIds = items.map((item) => item.docId).filter(Boolean) as string[];
    const updatedRecentIds = Array.from(new Set([...allIds, ...Array.from(existingIds)])).slice(
      0,
      CONFIG.RECENT_IDS_LIMIT,
    );

    await databases.updateDocument(CONFIG.APPWRITE_DATABASE_ID, CONFIG.COLLECTION_RSS, docId, {
      lastFetchedAt: new Date().toISOString(),
      latestTitles: finalTitles,
      recentIds: updatedRecentIds,
      ...(fetched.etag ? { lastEtag: fetched.etag } : {}),
      ...(fetched.lastModified ? { lastModified: fetched.lastModified } : {}),
    });

    if (newItems.length > 0) {
      const BATCH_SIZE = 10;
      for (let i = 0; i < newItems.length; i += BATCH_SIZE) {
        const chunk = newItems.slice(i, i + BATCH_SIZE);
        await Promise.allSettled(chunk.map((item) => createArticle(sourceData, item)));
      }

      logger.info(`   🚀 Found ${newItems.length} new articles.`);
      await sendNotifications(
        newItems.map((item) => ({ ...item, topicName })),
        summary,
      );
    } else {
      logger.info('   💤 No new articles.');
    }

    await cleanupOldArticles(name, category);
  } catch (error: any) {
    logger.error(`❌ Error in ${name}: ${error.message}`);
    summary.errors.push({ name, msg: error.message });
  }
}

async function runFetchRss(): Promise<void> {
  logger.info('🚀 Starting Unified Fetcher (API & RSS)...');
  const summary: RssSummary = { notificationsSent: 0, errors: [] };

  try {
    const res = await databases.listDocuments(CONFIG.APPWRITE_DATABASE_ID, CONFIG.COLLECTION_RSS, [
      Query.limit(1000),
    ]);

    const sources: SourceData[] = res.documents.map((doc) => ({
      docId: doc.$id,
      rssUrl: doc.rssUrl,
      name: doc.name,
      category: doc.category,
      raw: doc,
    }));

    logger.info(`Found ${sources.length} sources.`);

    for (let i = 0; i < sources.length; i += CONFIG.MAX_CONCURRENCY) {
      const chunk = sources.slice(i, i + CONFIG.MAX_CONCURRENCY);
      await Promise.all(chunk.map((source) => processSource(source, summary)));
    }
  } catch (error: any) {
    logger.error(error, 'Fatal Error');
  }

  logger.info(
    `\n--- Done. Sent: ${summary.notificationsSent}, Errors: ${summary.errors.length} ---`,
  );
}

export { runFetchRss };
