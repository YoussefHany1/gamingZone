import React, { useCallback } from "react";
import { ToastAndroid } from "react-native";
import { useTranslation } from "react-i18next";
import auth from "@react-native-firebase/auth";
import SkeletonMostAnticipated from "../../../skeleton/gamesScreen/SkeletonMostAnticipated";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useNotificationPreferences } from "@/src/hooks/useNotificationPreferences";
import NotificationService from "@/src/services/notificationService";
import { logger } from "@/src/lib/logger";
import { useMostAnticipated } from "../../../hooks/useMostAnticipated";
import { GameSection } from "./GameSection";
import AnticipatedCard from "./AnticipatedCard";
import type { Game } from "@/src/types/sharedTypes";

const CARD_WIDTH = 160;
const NOTIF_CATEGORY = "game_release";

/**
 * The games feed's `anticipated` section, rendered through the shared
 * shell's whole-section mode — same early-return skeleton idiom as
 * ComingSoon (whole section, header included), same
 * `error && gamesToShow.length === 0` error branch replacing the body, and
 * the shell's `extraData` passthrough drives the same bell-state reflow
 * (`useCallback`s and dependency order below are the legacy ones, so the
 * renderItem identity changes exactly when the preferences change, as
 * before). The Android-only `ToastAndroid` feedback stays Android-only —
 * the iOS gap is tracked in docs/known-gaps.md §1 as its own future phase
 * entry, not fixed silently here. Sorting lives in the hook, as ported.
 */
function MostAnticipated(): React.ReactElement {
  const styles = useThemeStyles(() => ({
    container: { marginVertical: 10 },
    listContent: { paddingHorizontal: 10, paddingVertical: 10 },
    headerContainer: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      justifyContent: "space-between",
      marginHorizontal: 18,
      marginBottom: 20,
    },
    errorContainer: {
      width: "100%",
      height: 300,
    },
  }));

  const { t } = useTranslation();
  const { preferences, toggleSource } = useNotificationPreferences();
  const userId = auth().currentUser?.uid;

  const { games: gamesToShow, isLoading, error: isError } = useMostAnticipated();

  const handleToggleNotification = useCallback(
    async (item: Game) => {
      if (!userId) {
        ToastAndroid.show(t("common.loginRequired"), ToastAndroid.LONG);
        return;
      }

      const topicName = NotificationService.getTopicName(NOTIF_CATEGORY, String(item.id));
      const willEnable = !preferences[topicName];

      try {
        await toggleSource(NOTIF_CATEGORY, String(item.id));
        ToastAndroid.show(
          willEnable
            ? t("games.details.subscribed")
            : t("games.details.unsubscribed"),
          ToastAndroid.SHORT,
        );
      } catch (e) {
        logger.error("Toggle notification error:", e);
        ToastAndroid.show(t("error"), ToastAndroid.SHORT);
      }
    },
    [userId, preferences, toggleSource, t],
  );

  const renderCard = useCallback(
    (item: Game) => {
      const topicName = NotificationService.getTopicName(NOTIF_CATEGORY, String(item.id));
      const isSubscribed = preferences[topicName] === true;

      return (
        <AnticipatedCard
          item={item}
          isSubscribed={isSubscribed}
          onToggleNotification={handleToggleNotification}
        />
      );
    },
    [preferences, handleToggleNotification],
  );

  const renderSkeletonItem = useCallback(() => <SkeletonMostAnticipated />, []);

  return (
    <GameSection
      title={t("games.list.mostAnticipated.title")}
      subtitle={t("games.list.mostAnticipated.subtitle")}
      games={gamesToShow}
      isLoading={isLoading}
      error={isError}
      renderCard={renderCard}
      renderSkeletonItem={renderSkeletonItem}
      skeletonMode="wholeSection"
      errorMode="errorWhenEmpty"
      horizontal
      useGestureScroll
      snapToInterval={CARD_WIDTH}
      extraData={preferences}
      styles={styles}
    />
  );
}

export default MostAnticipated;
