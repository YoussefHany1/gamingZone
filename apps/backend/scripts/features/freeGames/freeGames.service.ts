import { Query, Models } from 'node-appwrite';

import { loadBackendEnv } from '../../lib/env';
import { env } from '../../lib/config';
import { createAppwriteDatabases } from '../../lib/appwrite';
import { initFirebaseAdmin } from '../../lib/firebaseAdmin';
import { logger } from '../../lib/logger';

import { generateDocId } from './helpers';
import { searchIgdbGameId } from './igdb';
import { fetchSteamGames, fetchGogGames, fetchEpicGames, NormalizedGame } from './providers';

loadBackendEnv();

const CONFIG = {
  COLLECTION_FREE_GAMES: env.FREE_GAMES_COLLECTION_ID,
  APPWRITE_DATABASE_ID: env.APPWRITE_DATABASE_ID,
  EPIC_API_URL:
    'https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=en-US&country=US&allowCountries=US',
  STEAM_API_URL: 'https://www.gamerpower.com/api/giveaways?platform=steam&type=game&sort-by=value',
  GOG_API_URL: 'https://www.gamerpower.com/api/giveaways?platform=gog&type=game&sort-by=value',
  FCM_TOPIC: 'free_games_alerts',
  API_BASE_URL: 'https://igdb-api-omega.vercel.app',
};

const databases = createAppwriteDatabases();
const firebaseState = initFirebaseAdmin('FCM_SERVICE_ACCOUNT');

if (firebaseState.enabled) {
  logger.info('✅ Firebase Admin initialized.');
} else if (firebaseState.error) {
  logger.warn(`⚠️ Firebase error: ${firebaseState.error}`);
}

type FreeGameData = NormalizedGame & {
  igdb_game_id?: string | null;
  notificationSent?: boolean;
};

interface FreeGameDoc extends Models.Document, FreeGameData {}

async function sendGameNotification(game: FreeGameData): Promise<void> {
  if (!firebaseState.enabled || !firebaseState.admin) return;

  const imageLink = game.image || null;
  const storeName = game.store === 'steam' ? 'Steam' : game.store === 'gog' ? 'GOG' : 'Epic Games';

  const message = {
    topic: CONFIG.FCM_TOPIC,
    notification: {
      title: 'New Free Game! 🎁',
      body: `${game.title} is now free on ${storeName}!`,
      ...(imageLink && { image: imageLink }),
    },
    android: {
      priority: 'high' as const,
      notification: {
        sound: 'default',
        channelId: 'free_games_channel',
        ...(imageLink && { image: imageLink }),
      },
    },
    data: {
      type: 'free_game',
      slug: game.slug || '',
      url: game.url || '',
      clickAction: 'FLUTTER_NOTIFICATION_CLICK',
    },
  };

  try {
    await firebaseState.admin.messaging().send(message);
    logger.info(`   🔔 Notification sent for: ${game.title}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`   ❌ Notification failed: ${errorMessage}`);
  }
}

async function listAllDocuments(
  databaseId: string,
  collectionId: string,
  pageSize = 100,
): Promise<Models.Document[]> {
  const docs: Models.Document[] = [];
  let cursor: string | null = null;

  while (true) {
    const queries = [Query.limit(pageSize)];
    if (cursor) queries.push(Query.cursorAfter(cursor));

    const page = await databases.listDocuments(databaseId, collectionId, queries);
    docs.push(...page.documents);

    if (page.documents.length < pageSize) break;
    cursor = page.documents[page.documents.length - 1].$id;
  }

  return docs;
}

async function upsertGame(game: FreeGameData, activeIds: Set<string>): Promise<void> {
  const docId = generateDocId(game.slug);
  activeIds.add(docId);

  logger.info(`\n🎮 Processing [${game.store}]: ${game.title}`);

  let existingDoc: Models.Document | null = null;

  try {
    existingDoc = await databases.getDocument(
      CONFIG.APPWRITE_DATABASE_ID,
      CONFIG.COLLECTION_FREE_GAMES,
      docId,
    );
  } catch (error: any) {
    if (error?.code !== 404) {
      logger.error(`   ❌ Error fetching doc: ${error?.message || error}`);
    }
  }

  if (!existingDoc) {
    await createNewGame(docId, game);
    return;
  }

  await updateExistingGame(docId, game, existingDoc);
}

async function createNewGame(docId: string, game: FreeGameData): Promise<void> {
  try {
    logger.info(`   🔍 Searching IGDB for: ${game.title}`);
    const igdbId = await searchIgdbGameId(game.title || '', CONFIG.API_BASE_URL);

    game.igdb_game_id = igdbId || null;
    logger.info(igdbId ? `   ✅ Found IGDB ID: ${igdbId}` : '   ⚠️ No IGDB match found');

    let notificationSent = false;
    if (game.type === 'current') {
      await sendGameNotification(game);
      notificationSent = true;
    }

    await databases.createDocument(
      CONFIG.APPWRITE_DATABASE_ID,
      CONFIG.COLLECTION_FREE_GAMES,
      docId,
      { ...game, notificationSent },
    );

    logger.info('   ✨ Created NEW game document.');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`   ❌ Failed to create: ${errorMessage}`);
  }
}

async function updateExistingGame(
  docId: string,
  game: FreeGameData,
  existingDoc: Models.Document,
): Promise<void> {
  const alreadySent = (existingDoc as any).notificationSent === true;

  if (!(existingDoc as any).igdb_game_id) {
    logger.info('   🔍 Missing IGDB ID, searching...');
    const igdbId = await searchIgdbGameId(game.title || '', CONFIG.API_BASE_URL);
    game.igdb_game_id = igdbId || null;
    if (igdbId) logger.info(`   ✅ Found IGDB ID: ${igdbId}`);
  } else {
    game.igdb_game_id = (existingDoc as any).igdb_game_id;
  }

  if (game.type === 'current' && !alreadySent) {
    logger.info('   🔔 Sending delayed notification...');
    await sendGameNotification(game);

    await databases.updateDocument(
      CONFIG.APPWRITE_DATABASE_ID,
      CONFIG.COLLECTION_FREE_GAMES,
      docId,
      { ...game, notificationSent: true },
    );

    logger.info('   ✅ Updated doc: Notification marked as SENT.');
    return;
  }

  await databases.updateDocument(CONFIG.APPWRITE_DATABASE_ID, CONFIG.COLLECTION_FREE_GAMES, docId, {
    ...game,
    notificationSent: alreadySent,
  });

  logger.info(
    `   ℹ️ Updated details. Notification Status: ${
      alreadySent ? '✅ Already Sent' : '⏳ Not Sent Yet'
    }`,
  );
}

async function cleanupOldGames(activeIds: Set<string>): Promise<void> {
  logger.info('\n🧹 Cleaning up old games...');

  const existingDocs = await listAllDocuments(
    CONFIG.APPWRITE_DATABASE_ID,
    CONFIG.COLLECTION_FREE_GAMES,
    100,
  );

  const deletePromises = existingDocs
    .filter((doc) => !activeIds.has(doc.$id))
    .map((doc) =>
      databases.deleteDocument(CONFIG.APPWRITE_DATABASE_ID, CONFIG.COLLECTION_FREE_GAMES, doc.$id),
    );

  await Promise.all(deletePromises);
}

async function runFetchFreeGames(): Promise<void> {
  logger.info('🚀 Starting Free Games Fetcher (Safe-Update Mode)...');

  try {
    const [epicGames, steamGames, gogGames] = await Promise.all([
      fetchEpicGames(CONFIG.EPIC_API_URL).catch((error) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(errorMessage);
        return [];
      }),
      fetchSteamGames(CONFIG.STEAM_API_URL),
      fetchGogGames(CONFIG.GOG_API_URL),
    ]);

    const rawGames = [...epicGames, ...steamGames, ...gogGames];
    logger.info(
      `📥 Total Fetched: ${rawGames.length} entries (${epicGames.length} Epic, ${steamGames.length} Steam, ${gogGames.length} GOG).`,
    );

    const uniqueGamesMap = new Map<string, NormalizedGame>();
    for (const game of rawGames) {
      const docId = generateDocId(game.slug);
      if (!uniqueGamesMap.has(docId)) {
        uniqueGamesMap.set(docId, game);
      }
    }

    const uniqueGames = Array.from(uniqueGamesMap.values());
    logger.info(`✅ Processing ${uniqueGames.length} unique games.`);

    const activeIds = new Set<string>();
    for (const game of uniqueGames) {
      await upsertGame(game, activeIds);
    }

    await cleanupOldGames(activeIds);
  } catch (error) {
    logger.error(error, 'Fatal Error');
  }

  logger.info('\n--- Done. ---');
}

export { runFetchFreeGames };
