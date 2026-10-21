import React, { useCallback, useEffect, useState } from "react";
import { TouchableOpacity, ToastAndroid } from "react-native";
import { Bell, BellOff } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import auth from "@react-native-firebase/auth";
import analytics from "@react-native-firebase/analytics";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import SkeletonFreeGames from "../../../skeleton/gamesScreen/SkeletonFreeGames";
import NotificationService from "@/src/services/notificationService";
import { openLink } from "@/src/lib/browser";
import { logger } from "@/src/lib/logger";
import { useFreeGames } from "../../../hooks/useFreeGames";
import { GameSection } from "./GameSection";
import FreeGameCard from "./FreeGameCard";
import type { FreeGameItem } from "../../../types";

const NOTIF_CATEGORY = "free_games";
const NOTIF_SOURCE = "alerts";
const CARD_HEIGHT = 300;
const ESTIMATED_CARD_WIDTH = 185;

/**
 * The games feed's `free_games` section — the only Appwrite-backed rail
 * (Epic/GOG/Steam giveaways), the only one with a header notification
 * toggle, and the first registry entry (it renders without a
 * DeferredSection delay, as in the legacy registry) — rendered through
 * the shared shell's FreeGames-only configuration:
 *
 * - `skeletonMode="inline"`: the skeleton component wrapped in the
 *   list-paddings View, not a placeholder list;
 * - `pendingWhen="missingPayload"`: the skeleton keys on
 *   `isLoading && !Array.isArray(gamesList)` — array presence, not
 *   emptiness (it diverges from the siblings only while a refetch is in
 *   flight over a cached-but-empty list);
 * - its error branch is the plain `!!error` coercion, same effective
 *   semantics as the family-A rails at runtime;
 * - the data list has no third loading guard and CELL snapshots at the
 *   constant `ESTIMATED_CARD_WIDTH` on the native ScrollView (no gesture
 *   scroll component);
 * - the bell button rides in the header row via `headerTrailing`.
 *
 * The notification toasts remain Android-only (docs/known-gaps.md §1).
 * The wrapper keeps the legacy renderItem contract: the card takes `t`
 * as a prop, so the callback deps include it exactly as before.
 */
function FreeGames(): React.ReactElement {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [notifEnabled, setNotifEnabled] = useState(false);
  const userId = auth().currentUser?.uid;

  const styles = useThemeStyles((c) => ({
    headerContainer: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      justifyContent: "space-between",
      margin: 18,
    },
    bellButton: {
      padding: 10,
      backgroundColor: c.accentSurface,
      borderRadius: 12,
      marginLeft: "auto",
    },
    listContent: {
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    errorContainer: {
      height: CARD_HEIGHT,
    },
  }));

  const { games, isLoading, error } = useFreeGames();

  // Check user's notification preference on mount / user change
  useEffect(() => {
    if (!userId) return;
    let isMounted = true;

    const checkNotificationStatus = async (): Promise<void> => {
      try {
        const prefs = await NotificationService.getUserPreferences(userId);
        const topicName = NotificationService.getTopicName(NOTIF_CATEGORY, NOTIF_SOURCE);
        if (isMounted) setNotifEnabled(prefs[topicName] === true);
      } catch (e) {
        logger.debug("Error reading notification pref from Firestore", e);
      }
    };

    checkNotificationStatus();
    return () => {
      isMounted = false;
    };
  }, [userId]);

  const toggleNotifications = useCallback(async (): Promise<void> => {
    if (!userId) {
      ToastAndroid.show(t("common.loginRequired"), ToastAndroid.LONG);
      return;
    }

    const newStatus = !notifEnabled;
    setNotifEnabled(newStatus);

    try {
      await NotificationService.toggleNotificationPreference(
        userId,
        NOTIF_CATEGORY,
        NOTIF_SOURCE,
        newStatus,
      );
      ToastAndroid.show(
        newStatus
          ? t("games.list.freeGames.subscribed")
          : t("games.list.freeGames.unsubscribed"),
        ToastAndroid.LONG,
      );
    } catch (err) {
      logger.error("Toggle notifications error:", err);
      setNotifEnabled(!newStatus); // Revert on failure
      ToastAndroid.show(t("common.error"), ToastAndroid.LONG);
    }
  }, [userId, notifEnabled, t]);

  const handleClaimPress = useCallback(async (item: FreeGameItem): Promise<void> => {
    try {
      await analytics().logEvent("click_free_game", {
        item_id: item.id,
        item_name: item.title,
        content_type: "free_game_card",
        game_type: item.type,
        store: item.store ?? "epic",
      });
    } catch (analyticsError) {
      logger.debug("Analytics error:", analyticsError);
    }

    if (item.url) {
      openLink(item.url);
    } else if (item.slug) {
      openLink(`https://store.epicgames.com/en-US/p/${item.slug}`);
    }
  }, []);

  const renderCard = useCallback(
    (item: FreeGameItem) => (
      <FreeGameCard item={item} onClaim={handleClaimPress} t={t} />
    ),
    [handleClaimPress, t],
  );

  const renderSkeletonItem = useCallback(() => <SkeletonFreeGames />, []);

  return (
    <GameSection
      title={t("games.list.freeGames.header")}
      subtitle={t("games.list.freeGames.subtitle")}
      games={games}
      isLoading={isLoading}
      error={error}
      renderCard={renderCard}
      renderSkeletonItem={renderSkeletonItem}
      skeletonMode="inline"
      pendingWhen="missingPayload"
      horizontal
      snapToInterval={ESTIMATED_CARD_WIDTH}
      headerTrailing={
        <TouchableOpacity onPress={toggleNotifications} style={styles.bellButton}>
          {notifEnabled ? (
            <Bell size={22} color={colors.text} />
          ) : (
            <BellOff size={22} color={colors.textSubtle} />
          )}
        </TouchableOpacity>
      }
      styles={styles}
    />
  );
}

export default FreeGames;
