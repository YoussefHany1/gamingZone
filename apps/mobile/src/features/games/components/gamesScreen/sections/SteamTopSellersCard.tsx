import React, { useCallback } from "react";
import { View, TouchableOpacity } from "react-native";
import CustomText from "@/src/components/CustomText";
import { LinearGradient } from "expo-linear-gradient";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useThemeStore } from "@/src/store/useThemeStore";
import { CoverImage } from "./CoverImage";
import type { GamesStackParamList } from "../../../types";
import type { Game } from "@/src/types/sharedTypes";
import { usePcCompatibility } from "@/src/features/pcSpecs/hooks/usePcCompatibility";
import PcQualityBadge from "@/src/features/pcSpecs/components/PcQualityBadge";

export type SteamTopSellersCardProps = {
  item: Game;
  index: number;
};

const CARD_WIDTH = 180;
const CARD_HEIGHT = 280;
const CARD_MARGIN = 6;

const STEAM_BLUE = "#9CB4DD";
const STEAM_CARD_BG = "#172a4a";
// Fixed foregrounds for text sitting on the fixed navy card (see comment above).
const STEAM_TEXT = "#c7d5e0";
const STEAM_TEXT_STRONG = "#f0f6fb";
const STEAM_TEXT_DIM = "#8aa4c4";

const getReviewLabel = (rating: number): { label: string; color: string } => {
  // The card keeps a fixed Steam-navy surface (intentional branding), so its
  // foreground colors are fixed light-on-navy too — theme tokens would flip
  // dark in light mode and vanish against the navy.
  if (rating >= 9) return { label: "Overwhelmingly +", color: STEAM_BLUE };
  if (rating >= 8) return { label: "Very Positive", color: STEAM_BLUE };
  if (rating >= 7) return { label: "Mostly Positive", color: STEAM_BLUE };
  if (rating >= 5) return { label: "Mixed", color: STEAM_TEXT_DIM };
  return { label: "Mostly Negative", color: STEAM_TEXT_DIM };
};

/**
 * Steam storefront-styled card for the feed's steam top-sellers section.
 *
 * Ported verbatim from the legacy `gamesScreen/SteamTopSellers.tsx` card
 * (Phase 3 migration): Steam-blue palette consts, rank ribbon with gold
 * variant for top-3, "STEAM" watermark and the review-label dot whose
 * threshold colours come from `getReviewLabel`. The helper's imperative
 * theme read (and its rationale comment) are kept as in the legacy.
 */
const SteamTopSellersCard = React.memo<SteamTopSellersCardProps>(({ item, index }) => {
  const colors = useThemeColors();
  const compatibility = usePcCompatibility(item.id, item.first_release_date);
  const styles = useThemeStyles((c) => ({
    gameCard: {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      marginHorizontal: CARD_MARGIN,
      borderRadius: 4,
      overflow: "hidden",
      backgroundColor: STEAM_CARD_BG,
      // Steam-style: thin left border + very subtle right shadow
      borderWidth: 1,
      borderColor: c.accentBorder,
    },
    topAccentBar: {
      height: 3,
      backgroundColor: c.accent,
    },
    topAccentBarGold: { backgroundColor: c.accent },
    coverContainer: {
      width: "100%",
      height: 168,
      position: "relative",
    },
    cover: {
      width: "100%",
      height: "100%",
    },
    coverGradient: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: "45%",
    },
    rankBadge: {
      position: "absolute",
      bottom: 8,
      left: 8,
      flexDirection: "row",
      alignItems: "baseline",
      backgroundColor: "rgba(12, 26, 51, 0.88)",
      borderLeftWidth: 2,
      borderLeftColor: c.accent,
      paddingLeft: 6,
      paddingRight: 8,
      paddingVertical: 3,
      borderRadius: 2,
    },
    rankBadgeGold: { borderLeftColor: "#c6a84b" },
    rankHashSymbol: {
      color: STEAM_BLUE,
      fontSize: 10,
      fontWeight: "700",
      marginRight: 1,
    },
    rankNumber: {
      color: STEAM_TEXT_STRONG,
      fontSize: 18,
      fontWeight: "800",
      lineHeight: 20,
    },
    steamIconMark: {
      position: "absolute",
      top: 7,
      right: 7,
      backgroundColor: "rgba(12, 26, 51, 0.75)",
      paddingHorizontal: 5,
      paddingVertical: 2,
      borderRadius: 2,
    },
    steamIconText: {
      color: STEAM_BLUE + "cc",
      fontSize: 8,
      fontWeight: "800",
      letterSpacing: 1.5,
    },
    infoSection: {
      flex: 1,
      paddingHorizontal: 10,
      paddingTop: 8,
      paddingBottom: 8,
      gap: 5,
    },
    gameTitle: {
      color: STEAM_TEXT,
      fontSize: 15,
      fontWeight: "700",
      lineHeight: 17,
    },
    divider: {
      height: 1,
      backgroundColor: c.accentSurface,
      marginVertical: 2,
    },
    reviewRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    reviewDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    reviewLabel: {
      fontSize: 10,
      fontWeight: "600",
    },
  }));

  const navigation = useNavigation<NativeStackNavigationProp<GamesStackParamList>>();
  const rating = item.total_rating ? Math.round(item.total_rating) / 10 : 0;
  const rank = index + 1;
  const review = rating > 0 ? getReviewLabel(rating) : null;
  const isTopThree = rank <= 3;

  const handlePress = useCallback(() => {
    navigation.navigate("GameDetails", { gameID: item.id });
  }, [navigation, item.id]);

  return (
    <TouchableOpacity style={styles.gameCard} onPress={handlePress} activeOpacity={0.85}>
      {/* Steam-style top accent border */}
      <View style={[styles.topAccentBar, isTopThree && styles.topAccentBarGold]} />

      {/* Cover image area */}
      <View style={styles.coverContainer}>
        <CoverImage item={item} style={styles.cover} />

        {/* Bottom gradient */}
        <LinearGradient
          colors={["transparent", STEAM_CARD_BG]}
          style={styles.coverGradient}
        />

        {compatibility?.quality && (
          <PcQualityBadge
            quality={compatibility.quality}
            compact
            style={{ top: 6, left: 6 }}
          />
        )}

        {/* Rank badge — Steam "Top Seller" ribbon style */}
        <View style={[styles.rankBadge, isTopThree && styles.rankBadgeGold]}>
          <CustomText style={styles.rankHashSymbol}>#</CustomText>
          <CustomText style={styles.rankNumber}>{rank}</CustomText>
        </View>

        {/* Tiny "STEAM" watermark top-right */}
        <View style={styles.steamIconMark}>
          <CustomText style={styles.steamIconText}>STEAM</CustomText>
        </View>
      </View>

      {/* Info section */}
      <View style={styles.infoSection}>
        <CustomText style={styles.gameTitle} numberOfLines={3}>
          {item.name}
        </CustomText>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Review score row */}
        {review && (
          <View style={styles.reviewRow}>
            <View style={[styles.reviewDot, { backgroundColor: review.color }]} />
            <CustomText style={[styles.reviewLabel, { color: review.color }]}>
              {review.label}
            </CustomText>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
});
SteamTopSellersCard.displayName = "SteamTopSellersCard";

export default SteamTopSellersCard;
