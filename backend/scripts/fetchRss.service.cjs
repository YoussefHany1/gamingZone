const { Query } = require("node-appwrite");

const { loadBackendEnv } = require("./lib/env.cjs");
const {
  createAppwriteDatabases,
  requireEnvVar,
} = require("./lib/appwrite.cjs");
const { initFirebaseAdmin } = require("./lib/firebaseAdmin.cjs");
const { sha1Id } = require("./lib/hash.cjs");

const { safeId, resolveImageUrl } = require("./rss/helpers.cjs");
const { fetchFeed, fetchOgImage } = require("./rss/fetch.cjs");
const { normalizeItems } = require("./rss/normalize.cjs");

loadBackendEnv();

const CONFIG = {
  COLLECTION_RSS: process.env.RSS_COLLECTION_ID || "news_sources",
  COLLECTION_ARTICLES: process.env.ARTICLES_COLLECTION_ID || "articles",
  MAX_CONCURRENCY: 3,
  MAX_STORED_NEWS: 50,
  RECENT_IDS_LIMIT: 100,
  AXIOS_TIMEOUT: 30000,
  APPWRITE_DATABASE_ID: requireEnvVar("APPWRITE_DATABASE_ID"),
};

const databases = createAppwriteDatabases();
const firebaseState = initFirebaseAdmin("FCM_SERVICE_ACCOUNT");

if (firebaseState.enabled) {
  console.log("✅ Firebase Admin initialized.");
} else if (firebaseState.error) {
  console.warn("⚠️ Firebase error:", firebaseState.error);
}

async function sendNotifications(articles, summary) {
  if (!articles.length || !firebaseState.enabled || !firebaseState.admin)
    return;

  console.log(`🔔 Sending ${articles.length} notifications...`);
  const BATCH_SIZE = 10;

  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    const chunk = articles.slice(i, i + BATCH_SIZE);

    await Promise.allSettled(
      chunk.map(async (article) => {
        const imageLink = article.thumbnail || "";
        const message = {
          topic: article.topicName,
          notification: {
            title: article.title.substring(0, 150),
            body: article.description.substring(0, 150),
            ...(imageLink && { image: imageLink }),
          },
          android: {
            priority: "high",
            notification: {
              channelId: "news_notifications",
              ...(imageLink && { image: imageLink }),
            },
          },
          data: {
            link: article.link || "",
            image: imageLink || "",
            clickAction: "FLUTTER_NOTIFICATION_CLICK",
          },
        };

        try {
          await firebaseState.admin.messaging().send(message);
          summary.notificationsSent++;
          console.log(`   -> Sent: ${article.title.substring(0, 30)}...`);
        } catch (error) {
          console.error(`   -> Failed: ${error.message}`);
        }
      }),
    );
  }
}

async function createArticle(sourceData, item) {
  if (!item.thumbnail) {
    console.log(
      `      🖼️ Missing thumbnail. Fetching OG Image for: "${item.title.substring(0, 20)}..."`,
    );

    const enrichedImage = await fetchOgImage(item.link);
    if (enrichedImage) {
      item.thumbnail = resolveImageUrl(enrichedImage, sourceData.rssUrl);
      console.log("      ✅ Image found!");
    }
  }

  const payload = {
    title: item.title,
    link: item.link,
    description: item.description,
    pubDate:
      item.pubDate instanceof Date
        ? item.pubDate.toISOString()
        : new Date().toISOString(),
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
      item.docId,
      payload,
    );
  } catch (error) {
    if (error.code !== 409) {
      console.error(`      ❌ Save failed: ${error.message}`);
    }
  }
}

async function cleanupOldArticles(siteName) {
  try {
    const excessDocs = await databases.listDocuments(
      CONFIG.APPWRITE_DATABASE_ID,
      CONFIG.COLLECTION_ARTICLES,
      [
        Query.equal("siteName", siteName),
        Query.orderDesc("fetchedAt"),
        Query.limit(50),
        Query.offset(CONFIG.MAX_STORED_NEWS),
      ],
    );

    if (!excessDocs.documents.length) return;

    console.log(
      `      🧹 Cleanup: Deleting ${excessDocs.documents.length} old articles for ${siteName}...`,
    );

    const deletePromises = excessDocs.documents.map((doc) =>
      databases
        .deleteDocument(
          CONFIG.APPWRITE_DATABASE_ID,
          CONFIG.COLLECTION_ARTICLES,
          doc.$id,
        )
        .catch(() => console.error(`Failed to delete ${doc.$id}`)),
    );

    await Promise.all(deletePromises);
  } catch (error) {
    console.error(`      ⚠️ Cleanup failed: ${error.message}`);
  }
}

async function processSource(sourceData, summary) {
  const { rssUrl, category, name, docId, raw } = sourceData;
  const topicName = `${safeId(category)}_${safeId(name)}`;

  try {
    console.log(`📥 Processing: ${name}`);
    const fetched = await fetchFeed(rssUrl, CONFIG.AXIOS_TIMEOUT);
    let items = normalizeItems(fetched, rssUrl);

    if (
      name.toLowerCase().includes("techpowerup") ||
      rssUrl.includes("techpowerup")
    ) {
      items = items.map((item) => {
        const stableKey = (item.title || "").trim().toLowerCase();
        return { ...item, docId: sha1Id(stableKey) };
      });
    }

    if (!items.length) {
      console.log("   ⚠️ No items found after normalization.");
      return;
    }

    const uniqueMap = new Map();
    items.forEach((item) => uniqueMap.set(item.docId, item));
    items = Array.from(uniqueMap.values());

    const existingIds = new Set(raw.recentIds || []);
    const newItems = items.filter((item) => !existingIds.has(item.docId));

    console.log(
      `   🔍 Total items: ${items.length}, Unique docIds: ${new Set(items.map((item) => item.docId)).size}, New: ${newItems.length}`,
    );

    if (
      items.length > 0 &&
      new Set(items.map((item) => item.docId)).size === 1
    ) {
      console.log(
        `   ⚠️ WARNING: All items have same docId! Sample: ${JSON.stringify(items[0]).substring(0, 200)}`,
      );
    }

    const storedTitles = raw.latestTitles || [];
    const newTitles = newItems.map((item) => item.title);
    const finalTitles = [...newTitles, ...storedTitles].slice(
      0,
      CONFIG.MAX_STORED_NEWS,
    );

    const allIds = items.map((item) => item.docId);
    const updatedRecentIds = Array.from(
      new Set([...allIds, ...existingIds]),
    ).slice(0, CONFIG.RECENT_IDS_LIMIT);

    await databases.updateDocument(
      CONFIG.APPWRITE_DATABASE_ID,
      CONFIG.COLLECTION_RSS,
      docId,
      {
        lastFetchedAt: new Date().toISOString(),
        latestTitles: finalTitles,
        recentIds: updatedRecentIds,
      },
    );

    if (newItems.length > 0) {
      for (const item of newItems) {
        await createArticle(sourceData, item);
      }

      console.log(`   🚀 Found ${newItems.length} new articles.`);
      await sendNotifications(
        newItems.map((item) => ({ ...item, topicName })),
        summary,
      );
    } else {
      console.log("   💤 No new articles.");
    }

    await cleanupOldArticles(name);
  } catch (error) {
    console.error(`❌ Error in ${name}: ${error.message}`);
    summary.errors.push({ name, msg: error.message });
  }
}

async function runFetchRss() {
  console.log("🚀 Starting Unified Fetcher (API & RSS)...");
  const summary = { notificationsSent: 0, errors: [] };

  try {
    const res = await databases.listDocuments(
      CONFIG.APPWRITE_DATABASE_ID,
      CONFIG.COLLECTION_RSS,
      [Query.limit(1000)],
    );

    const sources = res.documents.map((doc) => ({
      docId: doc.$id,
      rssUrl: doc.rssUrl,
      name: doc.name,
      category: doc.category,
      raw: doc,
    }));

    console.log(`Found ${sources.length} sources.`);

    for (let i = 0; i < sources.length; i += CONFIG.MAX_CONCURRENCY) {
      const chunk = sources.slice(i, i + CONFIG.MAX_CONCURRENCY);
      await Promise.all(chunk.map((source) => processSource(source, summary)));
    }
  } catch (error) {
    console.error("Fatal Error:", error);
  }

  console.log(
    `\n--- Done. Sent: ${summary.notificationsSent}, Errors: ${summary.errors.length} ---`,
  );
}

module.exports = {
  runFetchRss,
};
