import axios from 'axios';
import { loadBackendEnv } from '../../lib/env';
import { requireTwitchCredentials } from '../../lib/config';
import { initFirebaseAdmin, firebaseAppFor } from '../../lib/firebaseAdmin';
import { ANDROID_CHANNEL_ID, buildTopicPush, sendTopicPush } from '../../lib/fcm';
import { logger } from '../../lib/logger';
import { getErrorMessage } from '../../lib/errors';
import { withRetry } from '../../lib/http';

loadBackendEnv();

const firebaseState = initFirebaseAdmin('gameReleases');

if (firebaseState.enabled) {
  logger.info('✅ Firebase Admin initialized for gameReleases.');
} else if (firebaseState.error) {
  logger.warn(`⚠️ Firebase error in gameReleases: ${firebaseState.error}`);
}

interface IgdbGameRelease {
  id: number;
  name: string;
  first_release_date?: number;
  cover?: {
    id?: number;
    image_id?: string;
  };
}

let cachedTwitchToken: { token: string; expiresAt: number } | null = null;

async function getTwitchAppToken(clientId: string, clientSecret: string): Promise<string> {
  if (cachedTwitchToken && cachedTwitchToken.expiresAt > Date.now() + 10000) {
    return cachedTwitchToken.token;
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'client_credentials',
  });

  const res = await withRetry(
    () =>
      axios.post('https://id.twitch.tv/oauth2/token', params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 10000,
      }),
    { label: 'Twitch OAuth Token' },
  );

  cachedTwitchToken = {
    token: res.data.access_token,
    expiresAt: Date.now() + res.data.expires_in * 1000,
  };
  return cachedTwitchToken.token;
}

export async function runCheckGameReleases(): Promise<{ found: number; sent: number }> {
  logger.info('🚀 Starting Daily Game Releases Notification Job...');

  const { clientId, clientSecret } = requireTwitchCredentials();
  const token = await getTwitchAppToken(clientId, clientSecret);

  const now = new Date();
  const startOfDay = Math.floor(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0) / 1000,
  );
  const endOfDay = startOfDay + 86400 - 1;

  logger.info(
    `📅 Checking games releasing today (UTC): ${new Date(startOfDay * 1000).toISOString()} to ${new Date(endOfDay * 1000).toISOString()}`,
  );

  const query = `
    fields id, name, cover.image_id, first_release_date;
    where first_release_date >= ${startOfDay} & first_release_date <= ${endOfDay};
    sort first_release_date asc;
    limit 100;
  `;

  const response = await withRetry(
    () =>
      axios.post<IgdbGameRelease[]>('https://api.igdb.com/v4/games', query, {
        headers: {
          'Client-ID': clientId,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'text/plain',
          Accept: 'application/json',
        },
        timeout: 10000,
      }),
    { label: 'IGDB Games Releasing Today' },
  );

  const games = Array.isArray(response.data) ? response.data : [];
  logger.info(`🎮 Found ${games.length} game(s) releasing today.`);

  let sent = 0;

  for (const game of games) {
    const topic = `game_release_${game.id}`;
    const imageLink = game.cover?.image_id
      ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${game.cover.image_id}.jpg`
      : null;

    logger.info(`📡 Sending release push for [${game.id}]: ${game.name} on topic: ${topic}`);

    const message = buildTopicPush({
      topic,
      title: '🎮 حان وقت اللعب!',
      body: `لعبة "${game.name}" متوفرة رسمياً الآن! تفقدها الآن في التطبيق.`,
      image: imageLink,
      channelId: ANDROID_CHANNEL_ID.NEWS,
      sound: 'default',
      data: {
        type: 'game_release',
        gameID: String(game.id),
      },
    });

    const { ok, error } = await sendTopicPush(firebaseState, message);
    if (ok) {
      sent++;
      logger.info(`   🔔 Release notification sent for: ${game.name}`);
    } else if (error) {
      logger.error(`   ❌ Release notification failed for ${game.name}: ${getErrorMessage(error)}`);
    }
  }

  logger.info(`✅ Game releases job finished. (Found: ${games.length}, Sent: ${sent})`);
  return { found: games.length, sent };
}

export async function teardownGameReleasesService(): Promise<void> {
  const app = firebaseAppFor(firebaseState);
  if (!app) return;

  try {
    await app.delete();
    logger.info('🛑 Game-releases Firebase app deleted cleanly.');
  } catch (error) {
    logger.error(`❌ Error deleting Firebase app: ${error}`);
  }
}
