import React, { useCallback, useMemo } from "react";
import { igdbImageUrl } from "@gaming-zone/utils";
import { View, TouchableOpacity, ToastAndroid } from "react-native";
import { ScrollView as GHScrollView } from "react-native-gesture-handler";
import CustomText from "@/src/components/CustomText";
import { Image } from "expo-image";
import { FlashList, ListRenderItemInfo } from "@shopify/flash-list";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { Bell, BellOff } from "lucide-react-native";
import auth from "@react-native-firebase/auth";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useNotificationPreferences } from "@/src/hooks/useNotificationPreferences";
import NotificationService from "@/src/services/notificationService";
import SectionTitle from "@/src/components/SectionTitle";
import SkeletonMostAnticipated from "../../skeleton/gamesScreen/SkeletonMostAnticipated";
import useCachedData from "@/src/hooks/useCachedData";
import type { AnticipatedCardProps } from "../../types";
import type { Game } from "@/src/types/sharedTypes";
import ErrorState from "@/src/components/ErrorState";
import { fetchMostAnticipatedGames } from "@/src/services/api/igdbApi";

const CARD_WIDTH = 160;
const STORAGE_KEY = "MOST_ANTICIPATED_CACHE";
const NOTIF_CATEGORY = "game_release";

// Sort ascending by release date; games without a date go to the end
const sortByReleaseDate = (games: Game[]): Game[] => {
  if (!Array.isArray(games) || games.length === 0) return [];
  return [...games].sort((a, b) => {
    const dateA = a.first_release_date ?? Infinity;
    const dateB = b.first_release_date ?? Infinity;
    return dateA - dateB;
  });
};

const formatDate = (timestamp: number | undefined, lang: string) => {
  if (!timestamp) return "TBD";
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString(lang, { day: "numeric", month: "short" });
};

// Card

const AnticipatedCard = React.memo<AnticipatedCardProps>(
  ({ item, isSubscribed, onToggleNotification }) => {
    const colors = useThemeColors();
    const styles = useThemeStyles((c) => ({
      cardContainer: {
        width: CARD_WIDTH,
        alignItems: "center",
      },
      timelineContainer: {
        width: "100%",
        alignItems: "center",
        justifyContent: "flex-end",
        marginBottom: 15,
        height: 45,
      },
      timelineLine: {
        position: "absolute",
        bottom: 5, // Aligns perfectly with the center of a 12px dot
        left: 0,
        right: 0,
        height: 2,
        backgroundColor: "#7f8c8d",
        zIndex: -1,
      },
      timelineDate: {
        color: c.text,
        fontSize: 16,
        fontWeight: "bold",
        marginBottom: 8,
      },
      timelineDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: c.text,
      },
      imageContainer: {
        width: 140,
        height: 200,
        borderRadius: 12,
        marginBottom: 12,
        position: "relative",
        overflow: "hidden",
        backgroundColor: c.accent,
      },
      coverImage: {
        width: "100%",
        height: "100%",
      },
      bellButton: {
        position: "absolute",
        top: 8,
        right: 8,
        backgroundColor: "rgba(0, 0, 0, 0.55)",
        borderRadius: 20,
        padding: 6,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.2)",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10,
      },
      bellButtonActive: {
        backgroundColor: c.accent,
        borderColor: c.accent,
      },
      title: {
        color: c.text,
        fontSize: 16,
        fontWeight: "bold",
        textAlign: "center",
        paddingHorizontal: 8,
        textTransform: "uppercase",
      },
    }));

    const { i18n } = useTranslation();
    const navigation = useNavigation<any>();

    const formattedDate = formatDate(item.first_release_date, i18n.language);

    const handlePress = useCallback(() => {
      navigation.navigate("GameDetails", { gameID: item.id });
    }, [navigation, item.id]);

    const handleBellPress = useCallback(
      (e: any) => {
        e?.stopPropagation?.();
        onToggleNotification?.(item);
      },
      [onToggleNotification, item],
    );

    return (
      <TouchableOpacity
        style={styles.cardContainer}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        {/* Timeline Section */}
        <View style={styles.timelineContainer}>
          <View style={styles.timelineLine} />
          <CustomText style={styles.timelineDate}>{formattedDate}</CustomText>
          <View style={styles.timelineDot} />
        </View>

        {/* Cover Image & Bell */}
        <View style={styles.imageContainer}>
          <Image
            source={
              item.cover
                ? {
                    uri: igdbImageUrl(item.cover.image_id, "cover_big"),
                  }
                : require("@/assets/image-not-found.webp")
            }
            style={styles.coverImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            recyclingKey={item.cover?.image_id || item.id.toString()}
          />

          <TouchableOpacity
            style={[styles.bellButton, isSubscribed && styles.bellButtonActive]}
            onPress={handleBellPress}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={
              isSubscribed
                ? "Turn off notifications for this game"
                : "Turn on notifications for this game"
            }
          >
            {isSubscribed ? (
              <Bell size={14} color={colors.onAccent} fill={colors.onAccent} />
            ) : (
              <BellOff size={14} color="#ffffff" />
            )}
          </TouchableOpacity>
        </View>

        {/* Title */}
        <CustomText style={styles.title} numberOfLines={2}>
          {item.name}
        </CustomText>
      </TouchableOpacity>
    );
  },
);
AnticipatedCard.displayName = "AnticipatedCard";

// Main

function MostAnticipated(): React.ReactElement {
  const styles = useThemeStyles((c) => ({
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

  const {
    data: games,
    isLoading,
    error: isError,
  } = useCachedData<Game[]>(STORAGE_KEY, fetchMostAnticipatedGames, []);

  const gamesToShow: Game[] = useMemo(() => sortByReleaseDate(games ?? []), [games]);

  const isInitialLoading = isLoading && gamesToShow.length === 0;

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
        console.error("Toggle notification error:", e);
        ToastAndroid.show(t("error"), ToastAndroid.SHORT);
      }
    },
    [userId, preferences, toggleSource, t],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Game>) => {
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

  if (isInitialLoading) return <SkeletonMostAnticipated />;

  if (isError && gamesToShow.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <ErrorState message={t("games.list.serverError")} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <SectionTitle
          title={t("games.list.mostAnticipated.title")}
          subtitle={t("games.list.mostAnticipated.subtitle")}
          fontSize={24}
        />
      </View>
      <FlashList
        renderScrollComponent={GHScrollView as any}
        data={gamesToShow}
        extraData={preferences}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        snapToInterval={CARD_WIDTH}
        decelerationRate="fast"
        ListEmptyComponent={
          <View style={styles.errorContainer}>
            <ErrorState message={t("games.list.serverError")} />
          </View>
        }
      />
    </View>
  );
}

export default MostAnticipated;
