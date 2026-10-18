import React, { useCallback } from "react";
import { View, TouchableOpacity } from "react-native";
import CustomText from "@/src/components/CustomText";
import type { GestureResponderEvent } from "react-native";
import { Bell, BellOff } from "lucide-react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { CoverImage } from "./CoverImage";
import type { GamesStackParamList } from "../../../types";
import type { Game } from "@/src/types/sharedTypes";

export type AnticipatedCardProps = {
  item: Game;
  isSubscribed?: boolean;
  onToggleNotification?: (item: Game) => void;
};

const CARD_WIDTH = 160;

const formatDate = (timestamp: number | undefined, lang: string) => {
  if (!timestamp) return "TBD";
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString(lang, { day: "numeric", month: "short" });
};

/**
 * Timeline card for the feed's anticipated section.
 *
 * Ported verbatim from the legacy `gamesScreen/MostAnticipated.tsx` card
 * (Phase 3 migration): timeline date above the cover, notification bell
 * overlay (solid when subscribed) and the uppercase title. The bell press
 * stops propagation so the card's own navigation press doesn't fire.
 *
 * Type-level cleanup, silent at runtime: the navigation prop is typed
 * against `GamesStackParamList` and the bell event against
 * `GestureResponderEvent` (the legacy used two `any`s — the optional-chained
 * `stopPropagation` call is preserved as-is).
 */
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
    const navigation = useNavigation<NativeStackNavigationProp<GamesStackParamList>>();

    const formattedDate = formatDate(item.first_release_date, i18n.language);

    const handlePress = useCallback(() => {
      navigation.navigate("GameDetails", { gameID: item.id });
    }, [navigation, item.id]);

    const handleBellPress = useCallback(
      (e: GestureResponderEvent) => {
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
          <CoverImage item={item} deriveRecyclingKey style={styles.coverImage} />

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

export default AnticipatedCard;
