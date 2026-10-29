import messaging from "@react-native-firebase/messaging";
import analytics from "@react-native-firebase/analytics";
import firestore, {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  updateDoc,
  deleteField,
} from "@react-native-firebase/firestore";
import type { FirebaseFirestoreTypes } from "@react-native-firebase/firestore";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { logger } from "@/src/lib/logger";
import { storage } from "@/src/lib/storage";

declare const globalThis: { RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS: boolean };
globalThis.RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = true;

// Types
export type NotificationPreferences = Record<string, boolean>;

// Preference data saved in Firestore
export interface NotificationPreferenceData {
  category: string;
  sourceName: string;
  enabled: boolean;
  topicId: string;
  updatedAt: ReturnType<typeof serverTimestamp>;
}

// user data saved in Firestore
//
// Push is multi-device: `fcmTokens` has one entry per app install, keyed by a
// locally generated install id so a rotated token overwrites its own slot
// instead of evicting another device's. `fcmToken` (legacy single-device field)
// is written in parallel until `push.ts` stops reading it.
export interface FcmTokenEntry {
  token: string;
  platform: string;
  updatedAt: ReturnType<typeof serverTimestamp>;
}

export interface UserTokenData {
  fcmToken: string;
  fcmTokens: Record<string, FcmTokenEntry>;
  lastActive: ReturnType<typeof serverTimestamp>;
}

/** Stable per-install id. Not a secret — it only names a map entry. */
const INSTALL_ID_KEY = "notifications.installId";

function getInstallId(): string {
  const existing = storage.getString(INSTALL_ID_KEY);
  if (existing) return existing;

  const generated = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  storage.set(INSTALL_ID_KEY, generated);
  return generated;
}

export interface NotificationSourceStatsData {
  category: string;
  sourceName: string;
  topicId: string;
  enabledCount: number;
  updatedAt: ReturnType<typeof serverTimestamp>;
}

const COLLECTIONS = {
  USERS: "users",
  PREFERENCES: "notificationPreferences",
  STATS: "notificationStats",
} as const;

const ERRORS = {
  MISSING_PARAMS: "⚠️ Missing required parameters: userId or token/topic.",
  FCM_FAIL: "❌ FCM Operation Failed:",
} as const;

const ANALYTICS_EVENTS = {
  PREF_CHANGED: "notification_pref_changed",
  SOURCE_ENABLED: "notification_source_enabled",
  SOURCE_DISABLED: "notification_source_disabled",
} as const;

const normalizeAnalyticsParam = (value: string, maxLength: number = 100): string =>
  value.toLowerCase().trim().replace(/\s+/g, "_").slice(0, maxLength);

class NotificationService {
  // generate a consistent topic name based on category and source
  static getTopicName(category: string, sourceName: string): string {
    if (!category || !sourceName) return "";

    const sanitizedSource = sourceName
      .toLowerCase()
      .replace(/[^a-z0-9-_.~%]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");

    return `${category}_${sanitizedSource}`;
  }

  // subscribe/unsubscribe helper to avoid code duplication
  private static async _handleTopicSubscription(
    topicName: string,
    subscribe: boolean,
  ): Promise<boolean> {
    if (!topicName) return false;

    const action = subscribe ? "subscribeToTopic" : "unsubscribeFromTopic";

    try {
      if (subscribe) {
        await messaging().subscribeToTopic(topicName);
      } else {
        await messaging().unsubscribeFromTopic(topicName);
      }
      return true;
    } catch (error) {
      logger.error(`${ERRORS.FCM_FAIL} ${action} ${topicName}`, error);
      return false;
    }
  }

  // subscribe to FCM topic
  static async subscribeToTopic(topicName: string): Promise<boolean> {
    return this._handleTopicSubscription(topicName, true);
  }

  // unsubscribe from FCM topic
  static async unsubscribeFromTopic(topicName: string): Promise<boolean> {
    return this._handleTopicSubscription(topicName, false);
  }

  // Switch notification preferences and save them to Firestore
  static async toggleNotificationPreference(
    userId: string,
    category: string,
    sourceName: string,
    enabled: boolean,
  ): Promise<void> {
    if (!userId) {
      logger.warn(ERRORS.MISSING_PARAMS);
      return;
    }

    const topicId = this.getTopicName(category, sourceName);

    try {
      // attempt to subscribe to/unsubscribe from FCM
      const fcmSuccess = await this._handleTopicSubscription(topicId, enabled);
      if (!fcmSuccess) {
        throw new Error("FCM Subscription failed, aborting Firestore write.");
      }

      const db = firestore();
      const userRef = doc(db, COLLECTIONS.USERS, userId);
      const prefRef = doc(collection(userRef, COLLECTIONS.PREFERENCES), topicId);
      const statsRef = doc(collection(db, COLLECTIONS.STATS), topicId);

      const data: NotificationPreferenceData = {
        category,
        sourceName,
        enabled,
        topicId,
        updatedAt: serverTimestamp(),
      };

      let enabledCountAfterChange = 0;

      await db.runTransaction(async (transaction) => {
        // Firestore requires ALL reads to happen before ANY writes.
        const [prefSnapshot, statsSnapshot] = await Promise.all([
          transaction.get(prefRef),
          transaction.get(statsRef),
        ]);

        const previousEnabled = prefSnapshot.exists()
          ? Boolean((prefSnapshot.data() as NotificationPreferenceData).enabled)
          : false;

        const delta = (enabled ? 1 : 0) - (previousEnabled ? 1 : 0);

        const statsData = statsSnapshot.exists()
          ? (statsSnapshot.data() as Partial<NotificationSourceStatsData>)
          : null;

        const currentCount =
          statsData && typeof statsData.enabledCount === "number"
            ? statsData.enabledCount
            : 0;

        const nextCount = Math.max(0, currentCount + delta);
        enabledCountAfterChange = nextCount;

        // All writes happen after all reads.
        transaction.set(prefRef, data, { merge: true });
        transaction.set(
          statsRef,
          {
            category,
            sourceName,
            topicId,
            enabledCount: nextCount,
            updatedAt: serverTimestamp(),
          } satisfies NotificationSourceStatsData,
          { merge: true },
        );
      });

      const normalizedCategory = normalizeAnalyticsParam(category);
      const normalizedSource = normalizeAnalyticsParam(sourceName);

      await analytics().logEvent(ANALYTICS_EVENTS.PREF_CHANGED, {
        topic_id: topicId,
        category: normalizedCategory,
        source_name: normalizedSource,
        enabled: enabled ? 1 : 0,
        enabled_count: enabledCountAfterChange,
      });

      await analytics().logEvent(
        enabled ? ANALYTICS_EVENTS.SOURCE_ENABLED : ANALYTICS_EVENTS.SOURCE_DISABLED,
        {
          topic_id: topicId,
          category: normalizedCategory,
          source_name: normalizedSource,
        },
      );
    } catch (error) {
      logger.error("❌ Failed to toggle preference:", error);
    }
  }

  // Get exact current enabled users count for a single source/topic
  static async getSourceEnabledCount(
    category: string,
    sourceName: string,
  ): Promise<number> {
    const topicId = this.getTopicName(category, sourceName);
    if (!topicId) return 0;

    try {
      const statsRef = doc(collection(firestore(), COLLECTIONS.STATS), topicId);
      const snapshot = await getDoc(statsRef);
      if (!snapshot.exists()) return 0;

      const data = snapshot.data() as Partial<NotificationSourceStatsData>;
      if (typeof data.enabledCount !== "number") return 0;

      return Math.max(0, Math.floor(data.enabledCount));
    } catch (error) {
      logger.error("❌ Failed to fetch source enabled count:", error);
      return 0;
    }
  }

  // Bring all notification preferences to the user
  static async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    if (!userId) return {};

    try {
      const preferencesRef = collection(
        doc(firestore(), COLLECTIONS.USERS, userId),
        COLLECTIONS.PREFERENCES,
      );
      const snapshot = await getDocs(preferencesRef);

      if (snapshot.empty) return {};

      const preferences: NotificationPreferences = {};
      snapshot.forEach((document: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
        preferences[document.id] = (
          document.data() as NotificationPreferenceData
        ).enabled;
      });

      return preferences;
    } catch (error) {
      logger.error("❌ Failed to fetch preferences:", error);
      return {};
    }
  }

  // Bulk synchronization of preferences (on app startup or restore)
  static async syncUserPreferences(
    userId: string,
    preferences: NotificationPreferences,
  ): Promise<void> {
    logger.debug("🔄 Starting Bulk Sync...");

    const operations: Promise<boolean>[] = Object.entries(preferences).map(
      ([topic, enabled]) =>
        enabled ? this.subscribeToTopic(topic) : this.unsubscribeFromTopic(topic),
    );

    const results = await Promise.allSettled(operations);

    const failures = results.filter((r) => r.status === "rejected");
    if (failures.length > 0) {
      logger.warn(`⚠️ ${failures.length} sync operations failed.`);
    } else {
      logger.debug("✅ Bulk Sync Completed Successfully");
    }
  }

  /** Stores the user's locale for server-side localized social notifications. */
  static async saveUserLanguage(userId: string, language: string): Promise<void> {
    if (!userId || !language) return;
    try {
      await updateDoc(doc(firestore(), COLLECTIONS.USERS, userId), { language });
    } catch (error) {
      logger.error("❌ Language Sync Error:", error);
    }
  }

  // Save FCM token to Firestore for the user.
  //
  // The map write is a dotted field path rather than `setDoc(..., { merge })`
  // with a nested map, because only the dot path is guaranteed to touch this
  // install's entry and leave the other devices' tokens untouched.
  static async saveFCMToken(userId: string, fcmToken: string): Promise<void> {
    if (!userId || !fcmToken) {
      logger.warn(ERRORS.MISSING_PARAMS);
      return;
    }

    try {
      const userRef = doc(firestore(), COLLECTIONS.USERS, userId);
      const tokenId = getInstallId();

      const data: UserTokenData = {
        fcmToken,
        fcmTokens: {
          [tokenId]: {
            token: fcmToken,
            platform: Platform.OS,
            updatedAt: serverTimestamp(),
          },
        },
        lastActive: serverTimestamp(),
      };

      const update: Record<string, unknown> = {
        fcmToken: data.fcmToken,
        lastActive: data.lastActive,
        [`fcmTokens.${tokenId}`]: data.fcmTokens[tokenId],
      };

      await updateDoc(userRef, update);
      logger.debug("✅ FCM Token Synced");
    } catch (error) {
      logger.error("❌ Token Sync Error:", error);
    }
  }

  /**
   * Removes this install's push token, called before sign-out so the next
   * account on the same device does not inherit notifications for the old one.
   * The legacy `fcmToken` is only cleared when it belongs to this install.
   */
  static async clearFCMToken(userId: string): Promise<void> {
    if (!userId) return;

    try {
      const userRef = doc(firestore(), COLLECTIONS.USERS, userId);
      const tokenId = getInstallId();
      const currentToken = await messaging()
        .getToken()
        .catch(() => "");

      const snapshot = await getDoc(userRef);
      const legacyToken = snapshot.exists() ? snapshot.get("fcmToken") : undefined;

      const update: Record<string, unknown> = {
        [`fcmTokens.${tokenId}`]: deleteField(),
      };
      if (currentToken && legacyToken === currentToken) {
        update.fcmToken = deleteField();
      }

      await updateDoc(userRef, update);
    } catch (error) {
      logger.error("❌ Token Clear Error:", error);
    }
  }

  // Send a test local notification (for development/testing purposes)
  static async testLocalNotification(): Promise<void> {
    const imageUrl =
      "https://media.rockstargames.com/rockstargames-newsite/uploads/b4546f96a016d9da31a9353e9b38d6aafe984436.jpg";

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "GTAV: Available Free on the Epic Games Store Until May 21st",
          body: "System Check: notifications are working.",
          sound: "default",
          categoryIdentifier: "news_notifications",
          badge: 1,
          attachments: [
            {
              url: imageUrl,
              identifier: "test-image",
              typeHint: "image",
              type: "",
            },
          ],
        },
        trigger: null,
        identifier: "test_notification",
      });
    } catch (error) {
      logger.error("❌ Local Notification Failed:", error);
    }
  }
}

export default NotificationService;
