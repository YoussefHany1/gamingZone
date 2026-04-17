const { Query } = require("node-appwrite");

const { loadBackendEnv } = require("./lib/env.cjs");
const {
  createAppwriteDatabases,
  requireEnvVar,
} = require("./lib/appwrite.cjs");
const { initFirebaseAdmin } = require("./lib/firebaseAdmin.cjs");

const { generateDocId } = require("./freeGames/helpers.cjs");
const { searchIgdbGameId } = require("./freeGames/igdb.cjs");
const {
  fetchSteamGames,
  fetchGogGames,
  fetchEpicGames,
} = require("./freeGames/providers.cjs");

loadBackendEnv();

const CONFIG = {
  COLLECTION_FREE_GAMES: process.env.FREE_GAMES_COLLECTION_ID || "free_games",
  APPWRITE_DATABASE_ID: requireEnvVar("APPWRITE_DATABASE_ID"),
  EPIC_API_URL:
    "https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=en-US&country=US&allowCountries=US",
  STEAM_API_URL:
    "https://www.gamerpower.com/api/giveaways?platform=steam&type=game&sort-by=value",
  GOG_API_URL:
    "https://www.gamerpower.com/api/giveaways?platform=gog&type=game&sort-by=value",
  FCM_TOPIC: "free_games_alerts",
  API_BASE_URL: "https://igdb-api-omega.vercel.app",
};

const databases = createAppwriteDatabases();
const firebaseState = initFirebaseAdmin("FCM_SERVICE_ACCOUNT");

if (firebaseState.enabled) {
  console.log("✅ Firebase Admin initialized.");
} else if (firebaseState.error) {
  console.warn("⚠️ Firebase error:", firebaseState.error);
}

async function sendGameNotification(game) {
  if (!firebaseState.enabled || !firebaseState.admin) return;

  const imageLink = game.image || null;
  const storeName =
    game.store === "steam"
      ? "Steam"
      : game.store === "gog"
        ? "GOG"
        : "Epic Games";

  const message = {
    topic: CONFIG.FCM_TOPIC,
    notification: {
      title: "New Free Game! 🎁",
      body: `${game.title} is now free on ${storeName}!`,
      ...(imageLink && { image: imageLink }),
    },
    android: {
      priority: "high",
      notification: {
        sound: "default",
        channelId: "free_games_channel",
        ...(imageLink && { image: imageLink }),
      },
    },
    data: {
      type: "free_game",
      slug: game.slug || "",
      url: game.url || "",
      clickAction: "FLUTTER_NOTIFICATION_CLICK",
    },
  };

  try {
    await firebaseState.admin.messaging().send(message);
    console.log(`   🔔 Notification sent for: ${game.title}`);
  } catch (error) {
    console.error(`   ❌ Notification failed: ${error.message}`);
  }
}

async function listAllDocuments(databaseId, collectionId, pageSize = 100) {
  const docs = [];
  let cursor = null;

  while (true) {
    const queries = [Query.limit(pageSize)];
    if (cursor) queries.push(Query.cursorAfter(cursor));

    const page = await databases.listDocuments(
      databaseId,
      collectionId,
      queries,
    );
    docs.push(...page.documents);

    if (page.documents.length < pageSize) break;
    cursor = page.documents[page.documents.length - 1].$id;
  }

  return docs;
}

async function upsertGame(game, activeIds) {
  const docId = generateDocId(game.slug);
  activeIds.add(docId);

  console.log(`\n🎮 Processing [${game.store}]: ${game.title}`);

  let existingDoc = null;

  try {
    existingDoc = await databases.getDocument(
      CONFIG.APPWRITE_DATABASE_ID,
      CONFIG.COLLECTION_FREE_GAMES,
      docId,
    );
  } catch (error) {
    if (error.code !== 404) {
      console.error(`   ❌ Error fetching doc: ${error.message}`);
    }
  }

  if (!existingDoc) {
    await createNewGame(docId, game);
    return;
  }

  await updateExistingGame(docId, game, existingDoc);
}

async function createNewGame(docId, game) {
  try {
    console.log(`   🔍 Searching IGDB for: ${game.title}`);
    const igdbId = await searchIgdbGameId(game.title, CONFIG.API_BASE_URL);

    game.igdb_game_id = igdbId || null;
    console.log(
      igdbId ? `   ✅ Found IGDB ID: ${igdbId}` : "   ⚠️ No IGDB match found",
    );

    let notificationSent = false;
    if (game.type === "current") {
      await sendGameNotification(game);
      notificationSent = true;
    }

    await databases.createDocument(
      CONFIG.APPWRITE_DATABASE_ID,
      CONFIG.COLLECTION_FREE_GAMES,
      docId,
      { ...game, notificationSent },
    );

    console.log("   ✨ Created NEW game document.");
  } catch (error) {
    console.error(`   ❌ Failed to create: ${error.message}`);
  }
}

async function updateExistingGame(docId, game, existingDoc) {
  const alreadySent = existingDoc.notificationSent === true;

  if (!existingDoc.igdb_game_id) {
    console.log("   🔍 Missing IGDB ID, searching...");
    const igdbId = await searchIgdbGameId(game.title, CONFIG.API_BASE_URL);
    game.igdb_game_id = igdbId || null;
    if (igdbId) console.log(`   ✅ Found IGDB ID: ${igdbId}`);
  } else {
    game.igdb_game_id = existingDoc.igdb_game_id;
  }

  if (game.type === "current" && !alreadySent) {
    console.log("   🔔 Sending delayed notification...");
    await sendGameNotification(game);

    await databases.updateDocument(
      CONFIG.APPWRITE_DATABASE_ID,
      CONFIG.COLLECTION_FREE_GAMES,
      docId,
      { ...game, notificationSent: true },
    );

    console.log("   ✅ Updated doc: Notification marked as SENT.");
    return;
  }

  await databases.updateDocument(
    CONFIG.APPWRITE_DATABASE_ID,
    CONFIG.COLLECTION_FREE_GAMES,
    docId,
    { ...game, notificationSent: alreadySent },
  );

  console.log(
    `   ℹ️ Updated details. Notification Status: ${
      alreadySent ? "✅ Already Sent" : "⏳ Not Sent Yet"
    }`,
  );
}

async function cleanupOldGames(activeIds) {
  console.log("\n🧹 Cleaning up old games...");

  const existingDocs = await listAllDocuments(
    CONFIG.APPWRITE_DATABASE_ID,
    CONFIG.COLLECTION_FREE_GAMES,
    100,
  );

  const deletePromises = existingDocs
    .filter((doc) => !activeIds.has(doc.$id))
    .map((doc) =>
      databases.deleteDocument(
        CONFIG.APPWRITE_DATABASE_ID,
        CONFIG.COLLECTION_FREE_GAMES,
        doc.$id,
      ),
    );

  await Promise.all(deletePromises);
}

async function runFetchFreeGames() {
  console.log("🚀 Starting Free Games Fetcher (Safe-Update Mode)...");

  try {
    const [epicGames, steamGames, gogGames] = await Promise.all([
      fetchEpicGames(CONFIG.EPIC_API_URL).catch((error) => {
        console.error(error.message);
        return [];
      }),
      fetchSteamGames(CONFIG.STEAM_API_URL),
      fetchGogGames(CONFIG.GOG_API_URL),
    ]);

    const rawGames = [...epicGames, ...steamGames, ...gogGames];
    console.log(
      `📥 Total Fetched: ${rawGames.length} entries (${epicGames.length} Epic, ${steamGames.length} Steam, ${gogGames.length} GOG).`,
    );

    const uniqueGamesMap = new Map();
    for (const game of rawGames) {
      const docId = generateDocId(game.slug);
      if (!uniqueGamesMap.has(docId)) {
        uniqueGamesMap.set(docId, game);
      }
    }

    const uniqueGames = Array.from(uniqueGamesMap.values());
    console.log(`✅ Processing ${uniqueGames.length} unique games.`);

    const activeIds = new Set();
    for (const game of uniqueGames) {
      await upsertGame(game, activeIds);
    }

    await cleanupOldGames(activeIds);
  } catch (error) {
    console.error("Fatal Error:", error);
  }

  console.log("\n--- Done. ---");
}

module.exports = {
  runFetchFreeGames,
};
