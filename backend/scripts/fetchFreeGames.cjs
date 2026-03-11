const axios = require("axios");
const crypto = require("crypto");
require("dotenv").config({ path: "F:\\Programing\\GamingZone\\backend\\.env" });
const { Client, Databases, Query } = require("node-appwrite");

// --- CONFIGURATION ---
const CONFIG = {
  COLLECTION_FREE_GAMES: process.env.FREE_GAMES_COLLECTION_ID || "free_games",
  APPWRITE_DATABASE_ID: process.env.APPWRITE_DATABASE_ID,
  EPIC_API_URL:
    "https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=en-US&country=US&allowCountries=US",
  STEAM_API_URL:
    "https://www.gamerpower.com/api/giveaways?platform=steam&type=game&sort-by=value",
  GOG_API_URL:
    "https://www.gamerpower.com/api/giveaways?platform=gog&type=game&sort-by=value",
  FCM_TOPIC: "free_games_alerts",
  API_BASE_URL: "https://igdb-api-omega.vercel.app",
};

// --- INIT APPWRITE ---
const client = new Client();
client
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

// --- INIT FIREBASE ADMIN ---
let admin = null;
let fcmEnabled = false;

try {
  admin = require("firebase-admin");
  if (process.env.FCM_SERVICE_ACCOUNT) {
    const svc = JSON.parse(process.env.FCM_SERVICE_ACCOUNT);
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(svc),
        projectId: svc.project_id,
      });
    }
    fcmEnabled = true;
    console.log("✅ Firebase Admin initialized.");
  }
} catch (e) {
  console.warn("⚠️ Firebase error:", e.message);
}

//  HELPERS
const cleanSlug = (rawSlug, title) => {
  if (rawSlug) return rawSlug.toLowerCase().trim();
  return title.toLowerCase().replace(/[^a-z0-9]/g, "-");
};

const generateDocId = (slug) => {
  return crypto.createHash("sha1").update(slug).digest("hex").substring(0, 36);
};

// CLEANING GAME NAMES
const cleanGameNameForSearch = (gameName) => {
  if (!gameName) return gameName;

  let cleanName = gameName;

  // remove "(Steam) Giveaway" pattern
  cleanName = cleanName.replace(/\(Steam\)\s*Giveaway/gi, "");

  // remove "(GOG) Giveaway" pattern
  cleanName = cleanName.replace(/\(GOG\)\s*Giveaway/gi, "");

  // remove "Giveaway" word
  cleanName = cleanName.replace(/Giveaway/gi, "");

  // remove empty parentheses
  cleanName = cleanName.replace(/\(\s*\)/g, "");

  // remove extra spaces
  cleanName = cleanName.trim().replace(/\s+/g, " ");

  return cleanName;
};

//  search IGDB ID by game name
async function searchIgdbGameId(gameName) {
  cleanName = cleanGameNameForSearch(gameName);
  try {
    const response = await axios.get(`${CONFIG.API_BASE_URL}/search-game-id`, {
      params: { name: cleanName },
      timeout: 10000,
    });

    return response.data.igdb_id || null;
  } catch (error) {
    console.log(
      `   ⚠️ Failed to get IGDB ID for "${cleanName}": ${error.message}`,
    );
    return null;
  }
}

// --- NOTIFICATION FUNCTION ---
async function sendGameNotification(game) {
  if (!fcmEnabled) return;
  const imageLink = game.image || null;
  const storeName = game.store === "steam" ? "Steam" : game.store === "gog" ? "GOG" : "Epic Games";

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
    await admin.messaging().send(message);
    console.log(`   🔔 Notification sent for: ${game.title}`);
  } catch (error) {
    console.error(`   ❌ Notification failed: ${error.message}`);
  }
}

// --- FETCHING LOGIC ---
async function fetchSteamGames() {
  try {
    console.log("📥 Fetching from Steam (via GamerPower)...");
    const response = await axios.get(CONFIG.STEAM_API_URL);
    const games = response.data;

    return games.map((game) => ({
      originalId: String(game.id),
      title: cleanGameNameForSearch(game.title),
      description: game.description || "",
      image: game.image,
      slug: `steam-${game.id}`,
      url: game.open_giveaway_url,
      store: "steam",
      type: "current",
      startDate: game.published_date,
      endDate: game.end_date,
      fetchedAt: new Date().toISOString(),
    }));
  } catch (error) {
    console.error(`⚠️ Steam Fetch failed: ${error.message}`);
    return [];
  }
}

async function fetchGogGames() {
  try {
    console.log("📥 Fetching from GOG (via GamerPower)...");
    const response = await axios.get(CONFIG.GOG_API_URL);
    const games = response.data;

    return games.map((game) => ({
      originalId: String(game.id),
      title: cleanGameNameForSearch(game.title),
      description: game.description || "",
      image: game.image,
      slug: `gog-${game.id}`,
      url: game.open_giveaway_url,
      store: "gog",
      type: "current",
      startDate: game.published_date,
      endDate: game.end_date,
      fetchedAt: new Date().toISOString(),
    }));
  } catch (error) {
    console.error(`⚠️ GOG Fetch failed: ${error.message}`);
    return [];
  }
}

async function fetchEpicGames() {
  try {
    console.log("📥 Fetching from Epic Games...");
    const response = await axios.get(CONFIG.EPIC_API_URL);
    const allGames = response.data.data.Catalog.searchStore.elements;

    const currentGames = allGames
      .filter((game) => {
        const promotions = game.promotions;
        if (
          !promotions ||
          !promotions.promotionalOffers ||
          promotions.promotionalOffers.length === 0
        )
          return false;

        const offerGroup = promotions.promotionalOffers[0];
        if (
          !offerGroup.promotionalOffers ||
          offerGroup.promotionalOffers.length === 0
        )
          return false;

        const offer = offerGroup.promotionalOffers[0];
        if (!offer || !offer.discountSetting) return false;
        return offer.discountSetting.discountPercentage === 0;
      })
      .map((game) => normalizeGame(game, "current"));

    const nextGames = allGames
      .filter((game) => {
        const promotions = game.promotions;
        if (
          !promotions ||
          !promotions.upcomingPromotionalOffers ||
          promotions.upcomingPromotionalOffers.length === 0
        ) {
          return false;
        }
        const offer =
          promotions.upcomingPromotionalOffers[0].promotionalOffers[0];
        if (!offer || !offer.discountSetting) return false;
        return offer.discountSetting.discountPercentage === 0;
      })
      .map((game) => normalizeGame(game, "next"));

    return [...currentGames, ...nextGames];
  } catch (error) {
    throw new Error(`Fetch failed: ${error.message}`);
  }
}

// --- NORMALIZATION ---
function normalizeGame(item, type) {
  const imageUrl =
    item.keyImages?.find((i) => i.type === "Thumbnail")?.url ||
    item.keyImages?.[0]?.url ||
    null;

  let rawSlug =
    item.productSlug ||
    item.offerMappings?.[0]?.pageSlug ||
    item.urlSlug ||
    null;

  const title = item.title;
  const finalSlug = cleanSlug(rawSlug, title);

  let startDate = null;
  let endDate = null;

  if (type === "current") {
    const offer = item.promotions.promotionalOffers[0].promotionalOffers[0];
    startDate = offer.startDate;
    endDate = offer.endDate;
  } else {
    const offer =
      item.promotions.upcomingPromotionalOffers[0].promotionalOffers[0];
    startDate = offer.startDate;
    endDate = offer.endDate;
  }

  return {
    originalId: item.id,
    title: title,
    description: item.description || "",
    image: imageUrl,
    slug: finalSlug,
    store: "epic",
    url: `https://store.epicgames.com/en-US/p/${finalSlug}`,
    type: type,
    startDate: startDate,
    endDate: endDate,
    fetchedAt: new Date().toISOString(),
  };
}

// --- MAIN PROCESS ---
async function run() {
  console.log("🚀 Starting Free Games Fetcher (Safe-Update Mode)...");

  try {
    const [epicGames, steamGames, gogGames] = await Promise.all([
      fetchEpicGames().catch((e) => {
        console.error(e.message);
        return [];
      }),
      fetchSteamGames(),
      fetchGogGames(),
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
      } catch (e) {
        if (e.code !== 404)
          console.error(`   ❌ Error fetching doc: ${e.message}`);
      }

      if (!existingDoc) {
        // --- لعبة جديدة ---
        try {
          // 🆕 البحث عن IGDB ID
          console.log(`   🔍 Searching IGDB for: ${game.title}`);
          const igdbId = await searchIgdbGameId(game.title);

          if (igdbId) {
            console.log(`   ✅ Found IGDB ID: ${igdbId}`);
            game.igdb_game_id = igdbId;
          } else {
            console.log(`   ⚠️ No IGDB match found`);
            game.igdb_game_id = null;
          }

          let notificationSent = false;
          if (game.type === "current") {
            await sendGameNotification(game);
            notificationSent = true;
          }

          await databases.createDocument(
            CONFIG.APPWRITE_DATABASE_ID,
            CONFIG.COLLECTION_FREE_GAMES,
            docId,
            { ...game, notificationSent: notificationSent },
          );
          console.log(`   ✨ Created NEW game document.`);
        } catch (createError) {
          console.error(`   ❌ Failed to create: ${createError.message}`);
        }
      } else {
        // --- لعبة موجودة مسبقاً ---
        const alreadySent = existingDoc.notificationSent === true;

        // 🆕 إذا لم يكن لديها IGDB ID، حاول البحث عنه
        if (!existingDoc.igdb_game_id) {
          console.log(`   🔍 Missing IGDB ID, searching...`);
          const igdbId = await searchIgdbGameId(game.title);
          if (igdbId) {
            console.log(`   ✅ Found IGDB ID: ${igdbId}`);
            game.igdb_game_id = igdbId;
          } else {
            game.igdb_game_id = null;
          }
        } else {
          game.igdb_game_id = existingDoc.igdb_game_id;
        }

        if (game.type === "current" && !alreadySent) {
          console.log(`   🔔 Sending delayed notification...`);
          await sendGameNotification(game);

          await databases.updateDocument(
            CONFIG.APPWRITE_DATABASE_ID,
            CONFIG.COLLECTION_FREE_GAMES,
            docId,
            { ...game, notificationSent: true },
          );
          console.log(`   ✅ Updated doc: Notification marked as SENT.`);
        } else {
          await databases.updateDocument(
            CONFIG.APPWRITE_DATABASE_ID,
            CONFIG.COLLECTION_FREE_GAMES,
            docId,
            {
              ...game,
              notificationSent: alreadySent,
            },
          );
          console.log(
            `   ℹ️ Updated details. Notification Status: ${
              alreadySent ? "✅ Already Sent" : "⏳ Not Sent Yet"
            }`,
          );
        }
      }
    }

    // --- CLEANUP ---
    console.log("\n🧹 Cleaning up old games...");
    const existingDocs = await databases.listDocuments(
      CONFIG.APPWRITE_DATABASE_ID,
      CONFIG.COLLECTION_FREE_GAMES,
      [Query.limit(100)],
    );

    const deletePromises = existingDocs.documents
      .filter((doc) => !activeIds.has(doc.$id))
      .map((doc) =>
        databases.deleteDocument(
          CONFIG.APPWRITE_DATABASE_ID,
          CONFIG.COLLECTION_FREE_GAMES,
          doc.$id,
        ),
      );

    await Promise.all(deletePromises);
  } catch (e) {
    console.error("Fatal Error:", e);
  }

  console.log("\n--- Done. ---");
  process.exit(0);
}

run();
