import * as admin from 'firebase-admin';

import { getErrorMessage } from './errors';
import { FirebaseAdminState, firebaseAppFor } from './firebaseAdmin';
import { logger } from './logger';

/**
 * Android notification channels. These must match the channel IDs the mobile
 * app creates on first launch, otherwise Android drops the notification.
 */
export const ANDROID_CHANNEL_ID = {
  NEWS: 'news_notifications',
  FREE_GAMES: 'free_games_channel',
} as const;

/**
 * Notification topics clients subscribe to per feature. The RSS sync uses a
 * per-article topic (each news topic subscribes its own audience), so only the
 * two fixed-feature topics are centralized here.
 */
export const FCM_TOPIC = {
  FREE_GAMES: 'free_games_alerts',
  WEEKLY_SUMMARY: 'weekly_summary_alerts',
} as const;

/** Deep-link action flag the mobile app reads from the push payload. */
const FLUTTER_NOTIFICATION_CLICK = 'FLUTTER_NOTIFICATION_CLICK';

export interface TopicPushOptions {
  topic: string;
  title: string;
  body: string;
  /** Optional image URL attached to both the notification and Android payload. */
  image?: string | null;
  channelId: string;
  /** Optional non-default Android notification sound name. */
  sound?: string;
  /** Extra data payload — `clickAction` is always appended by the builder. */
  data?: Record<string, string>;
}

/**
 * Builds an FCM topic message envelope shared by the free-games, RSS and
 * weekly-summary pushes: a notification + high-priority Android config with a
 * channel id + `clickAction` deep-link data.
 */
export function buildTopicPush(opts: TopicPushOptions): admin.messaging.Message {
  const { topic, title, body, image, channelId, sound, data } = opts;
  return {
    topic,
    notification: {
      title,
      body,
      ...(image ? { image } : {}),
    },
    android: {
      priority: 'high' as const,
      notification: {
        ...(sound ? { sound } : {}),
        channelId,
        ...(image ? { image } : {}),
      },
    },
    data: {
      ...(data ?? {}),
      clickAction: FLUTTER_NOTIFICATION_CLICK,
    },
  };
}

/**
 * Sends a topic push for a feature's named Firebase app. Returns
 * `{ ok: false, error: null }` when the service was disabled/uninitialized
 * (callers skip silently, matching the old guard behaviour) and
 * `{ ok: false, error }` on a real send failure.
 */
export async function sendTopicPush(
  state: FirebaseAdminState,
  message: admin.messaging.Message,
): Promise<{ ok: boolean; error: Error | null }> {
  const app = firebaseAppFor(state);
  if (!state.enabled || !app) return { ok: false, error: null };

  try {
    await state.admin.messaging(app).send(message!);
    return { ok: true, error: null };
  } catch (error) {
    return { ok: false, error: new Error(getErrorMessage(error)) };
  }
}