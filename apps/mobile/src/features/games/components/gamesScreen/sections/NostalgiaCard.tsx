import React, { useCallback } from "react";
import { View, TouchableOpacity, Dimensions } from "react-native";
import CustomText from "@/src/components/CustomText";
import { LinearGradient } from "expo-linear-gradient";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { CoverImage } from "./CoverImage";
import type { GamePlatform, GamesStackParamList } from "../../../types";
import type { Game } from "@/src/types/sharedTypes";

export type NostalgiaCardProps = {
  item: Game;
};

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.55;
const CARD_HEIGHT = 360;
const CARD_MARGIN = 10;

const getYear = (timestamp: number | null | undefined): number | "" => {
  if (!timestamp) return "";
  return new Date(timestamp * 1000).getFullYear();
};

const getDecade = (year: number | ""): string => {
  if (!year) return "";
  return `${Math.floor(year / 10) * 10}s`;
};

// Priority-ordered list of retro console identifiers
const RETRO_PRIORITY: string[] = [
  "PS1",
  "PS2",
  "PS3",
  "Xbox",
  "X360",
  "Atari",
  "NES",
  "SNES",
  "N64",
  "GameCube",
  "Wii",
  "GB",
  "GBC",
  "GBA",
  "NDS",
  "3DS",
  "PSP",
  "PS Vita",
  "Genesis",
  "Dreamcast",
  "Saturn",
  "Commodore",
];

// Returns the most iconic retro platform name for a given list of platforms
const getRetroConsole = (platforms: GamePlatform[] | null | undefined): string | null => {
  if (!platforms || platforms.length === 0) return null;

  for (const priority of RETRO_PRIORITY) {
    const found = platforms.find(
      (p) => p.abbreviation?.includes(priority) || p.name?.includes(priority),
    );
    if (found) return found.abbreviation ?? found.name ?? null;
  }

  return platforms[0]?.abbreviation ?? platforms[0]?.name ?? null;
};

/**
 * Vintage-framed card for the feed's nostalgia section.
 *
 * Ported verbatim from the legacy `gamesScreen/NostalgiaCorner.tsx` card
 * (Phase 3 migration): decade badge, sepia-tinted framed cover with drop
 * shadow layer, ribbon title bar, retro console badge chosen by the
 * priority list above, and the four corner decorations. Decorative literal
 * colours (the hardcoded gradient stops) are parity copies — Phase 4's
 * GameCard pass owns any retinting.
 *
 * Type-level cleanup, silent at runtime: the navigation prop is typed
 * against `GamesStackParamList` (the legacy used the loose
 * `NavigationProp<Record<string, object | undefined>>`).
 */
const NostalgiaCard = React.memo<NostalgiaCardProps>(({ item }) => {
  const colors = useThemeColors();
  const styles = useThemeStyles((c) => ({
    gameCard: {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      marginHorizontal: CARD_MARGIN,
      position: "relative",
    },
    paperBackground: {
      position: "absolute",
      width: "100%",
      height: "100%",
      borderRadius: 12,
    },
    outerFrame: {
      flex: 1,
      margin: 8,
      padding: 12,
      borderWidth: 3,
      borderColor: c.textMuted,
      borderRadius: 8,
      backgroundColor: c.background,
      position: "relative",
    },
    decadeBadge: {
      position: "absolute",
      top: -12,
      right: 20,
      backgroundColor: c.accent,
      paddingHorizontal: 16,
      paddingVertical: 6,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: c.textMuted,
      zIndex: 5,
      elevation: 4,
      shadowColor: c.textMuted,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.5,
      shadowRadius: 4,
    },
    decadeText: {
      color: c.text,
      fontSize: 13,
      fontWeight: "bold",
      letterSpacing: 1,
    },
    coverFrame: { alignSelf: "center", marginTop: 10 },
    coverInnerFrame: {
      padding: 4,
      backgroundColor: c.backgroundDeep,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: c.accentText,
      elevation: 6,
      shadowColor: c.textMuted,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.6,
      shadowRadius: 6,
    },
    cover: { width: 120, height: 160, borderRadius: 4 },
    sepiaOverlay: {
      position: "absolute",
      top: 4,
      left: 4,
      right: 4,
      bottom: 4,
      backgroundColor: "rgba(81, 105, 150, 0.15)",
      borderRadius: 4,
    },
    frameShadow: {
      position: "absolute",
      top: 8,
      left: 8,
      right: -8,
      bottom: -8,
      backgroundColor: "rgba(0, 0, 28, 0.6)",
      borderRadius: 8,
      zIndex: -1,
    },
    titleRibbon: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 12,
      marginBottom: 8,
    },
    ribbonLeft: {
      width: 0,
      height: 0,
      borderTopWidth: 12,
      borderTopColor: "transparent",
      borderBottomWidth: 12,
      borderBottomColor: "transparent",
      borderRightWidth: 10,
      borderRightColor: c.accent,
    },
    ribbonCenter: {
      flex: 1,
      backgroundColor: c.accent,
      paddingVertical: 4,
      alignItems: "center",
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: c.textMuted,
    },
    ribbonRight: {
      width: 0,
      height: 0,
      borderTopWidth: 12,
      borderTopColor: "transparent",
      borderBottomWidth: 12,
      borderBottomColor: "transparent",
      borderLeftWidth: 10,
      borderLeftColor: c.accent,
    },
    titleText: {
      color: c.text,
      fontSize: 16,
      fontWeight: "bold",
      textAlign: "center",
      letterSpacing: 3,
      textShadowColor: "rgba(0, 0, 0, 0.5)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    infoContainer: { flex: 1 },
    consoleBadge: {
      // flexDirection: "row",
      alignSelf: "center",
      alignItems: "center",
      backgroundColor: c.accentSurface,
      borderWidth: 1,
      borderColor: c.textMuted,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 4,
      gap: 6,
    },
    consoleText: { color: c.textMuted, fontSize: 12, fontWeight: "bold" },
    cornerTopLeft: {
      position: "absolute",
      top: 5,
      left: 5,
      width: 15,
      height: 15,
      borderTopWidth: 3,
      borderLeftWidth: 3,
      borderColor: c.accentText,
    },
    cornerTopRight: {
      position: "absolute",
      top: 5,
      right: 5,
      width: 15,
      height: 15,
      borderTopWidth: 3,
      borderRightWidth: 3,
      borderColor: c.accentText,
    },
    cornerBottomLeft: {
      position: "absolute",
      bottom: 5,
      left: 5,
      width: 15,
      height: 15,
      borderBottomWidth: 3,
      borderLeftWidth: 3,
      borderColor: c.accentText,
    },
    cornerBottomRight: {
      position: "absolute",
      bottom: 5,
      right: 5,
      width: 15,
      height: 15,
      borderBottomWidth: 3,
      borderRightWidth: 3,
      borderColor: c.accentText,
    },
  }));

  const navigation = useNavigation<NativeStackNavigationProp<GamesStackParamList>>();

  const year = getYear(item.first_release_date);
  const decade = getDecade(year);
  const retroConsole = getRetroConsole(item.platforms);

  const handlePress = useCallback((): void => {
    navigation.navigate("GameDetails", { gameID: item.id });
  }, [navigation, item.id]);

  return (
    <TouchableOpacity style={styles.gameCard} onPress={handlePress} activeOpacity={0.85}>
      {/* Vintage dark background */}
      <LinearGradient
        colors={[colors.background, "#172a4a", "#1a3052"]}
        style={styles.paperBackground}
      />

      <View style={styles.outerFrame}>
        {/* Decade badge positioned at the top edge */}
        <View style={styles.decadeBadge}>
          <CustomText style={styles.decadeText}>{decade}</CustomText>
        </View>

        {/* Cover image with sepia overlay */}
        <View style={styles.coverFrame}>
          <View style={styles.coverInnerFrame}>
            <CoverImage item={item} deriveRecyclingKey style={styles.cover} />
            {/* Subtle sepia tint for a retro feel */}
            <View style={styles.sepiaOverlay} />
          </View>
          <View style={styles.frameShadow} />
        </View>

        {/* Ribbon-style title bar */}
        <View style={styles.titleRibbon}>
          <View style={styles.ribbonLeft} />
          <View style={styles.ribbonCenter}>
            <CustomText style={styles.titleText}>{item.name}</CustomText>
          </View>
          <View style={styles.ribbonRight} />
        </View>

        {/* Console info */}
        <View style={styles.infoContainer}>
          {retroConsole && (
            <View style={styles.consoleBadge}>
              <CustomText style={styles.consoleText}>{retroConsole}</CustomText>
            </View>
          )}
        </View>

        {/* Classic corner decorations */}
        <View style={styles.cornerTopLeft} />
        <View style={styles.cornerTopRight} />
        <View style={styles.cornerBottomLeft} />
        <View style={styles.cornerBottomRight} />
      </View>
    </TouchableOpacity>
  );
});
NostalgiaCard.displayName = "NostalgiaCard";

export default NostalgiaCard;
