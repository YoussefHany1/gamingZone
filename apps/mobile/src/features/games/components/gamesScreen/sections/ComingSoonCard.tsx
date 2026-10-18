import React, { useCallback } from "react";
import { View, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import CustomText from "@/src/components/CustomText";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useCountdown } from "@/src/hooks/useCountdown";
import { CoverImage } from "./CoverImage";
import type { GamesStackParamList } from "../../../types";
import type { Game } from "@/src/types/sharedTypes";

export type ComingSoonCardProps = {
  item: Game;
};

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.85;
const CARD_HEIGHT = 220;

/**
 * Countdown card for the feed's coming-soon section.
 *
 * Ported verbatim from the legacy `gamesScreen/ComingSoon.tsx` card (Phase 3
 * migration): full-bleed screenshot background, four-tenths overlay and the
 * days/hours/minutes row. The countdown labels reuse the legacy's i18n keys
 * under `games.list.mostAnticipated.countdown.*` — that cross-reference to
 * the most-anticipated section is intentional and preserved as-is.
 *
 * Two type-level cleanups, both silent at runtime: the navigation prop is
 * typed against `GamesStackParamList` (the legacy used `useNavigation<any>()`),
 * and the redundant `as CountdownResult | null` cast on the countdown value
 * is dropped — `useCountdown` already declares exactly that return type.
 */
const ComingSoonCard = React.memo<ComingSoonCardProps>(({ item }) => {
  const styles = useThemeStyles((c) => ({
    cardContainer: {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      marginHorizontal: 10,
      borderRadius: 20,
      overflow: "hidden",
      backgroundColor: c.accent,
      elevation: 5,
    },
    backgroundImage: {
      width: "100%",
      height: "100%",
      position: "absolute",
    },
    overlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: "rgba(0,0,0,0.4)",
    },
    content: {
      flex: 1,
      justifyContent: "center",
      padding: 20,
      flexDirection: "row",
      gap: 15,
    },
    dateContainer: {
      flexDirection: "column",
      alignItems: "center",
      alignSelf: "center",
      borderRadius: 12,
    },
    countdownHeader: { color: c.text, fontSize: 14 },
    countdownText: {
      color: c.text,
      fontWeight: "bold",
      fontSize: 32,
      backgroundColor: c.accentSurface,
      paddingHorizontal: 12,
      borderRadius: 50,
    },
    textWrapper: { marginBottom: 10, marginHorizontal: 10 },
    title: {
      color: c.text,
      fontSize: 24,
      fontWeight: "bold",
      textShadowColor: "rgba(0, 0, 0, 0.75)",
      textShadowOffset: { width: -1, height: 1 },
      textShadowRadius: 10,
    },
  }));

  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<GamesStackParamList>>();

  // Update countdown every minute — minute precision is sufficient here
  const timeLeft = useCountdown(item.first_release_date, 60_000);

  const handlePress = useCallback(() => {
    navigation.navigate("GameDetails", { gameID: item.id });
  }, [navigation, item.id]);

  return (
    <TouchableOpacity
      style={styles.cardContainer}
      onPress={handlePress}
      activeOpacity={0.9}
    >
      <CoverImage
        item={item}
        imageSize="screenshot_med"
        deriveRecyclingKey
        style={styles.backgroundImage}
      />

      <View style={styles.overlay} />

      {/* Countdown row */}
      <View style={styles.content}>
        <View style={styles.dateContainer}>
          <CustomText style={styles.countdownHeader}>
            {t("games.list.mostAnticipated.countdown.days")}
          </CustomText>
          <CustomText style={styles.countdownText}>
            {timeLeft ? timeLeft.days : "—"}
          </CustomText>
        </View>
        <View style={styles.dateContainer}>
          <CustomText style={styles.countdownHeader}>
            {t("games.list.mostAnticipated.countdown.hours")}
          </CustomText>
          <CustomText style={styles.countdownText}>
            {timeLeft ? timeLeft.hours : "—"}
          </CustomText>
        </View>
        <View style={styles.dateContainer}>
          <CustomText style={styles.countdownHeader}>
            {t("games.list.mostAnticipated.countdown.minutes")}
          </CustomText>
          <CustomText style={styles.countdownText}>
            {timeLeft ? timeLeft.minutes : "—"}
          </CustomText>
        </View>
      </View>

      <View style={styles.textWrapper}>
        <CustomText style={styles.title} numberOfLines={2}>
          {item.name}
        </CustomText>
      </View>
    </TouchableOpacity>
  );
});
ComingSoonCard.displayName = "ComingSoonCard";

export default ComingSoonCard;
