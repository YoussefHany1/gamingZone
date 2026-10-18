import React, { useCallback, useMemo } from "react";
import { View, TouchableOpacity } from "react-native";
import CustomText from "@/src/components/CustomText";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Gift } from "lucide-react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useThemeStore } from "@/src/store/useThemeStore";
import CountdownTimer from "./CountdownTimer";
import { SteamIcon, GogIcon, EpicGamesIcon } from "@/src/components/icons/StoreIcons";
import type { GamesStackParamList } from "../../../types";
import type { FreeGameItem } from "../../../types";

export type FreeGameCardProps = {
  item: FreeGameItem;
  onClaim: (item: FreeGameItem) => void;
  t: (key: string) => string;
};

const CARD_HEIGHT = 300;

const renderStoreIcon = (store?: string) => {
  // Called during render, so an imperative read observes the current palette.
  const iconColor = useThemeStore.getState().colors.text;
  if (store === "steam") return <SteamIcon size={20} fill={iconColor} />;
  if (store === "gog") return <GogIcon size={20} fill={iconColor} />;
  return <EpicGamesIcon size={20} fill={iconColor} />;
};

/**
 * Card for the feed's free-games section: one per Appwrite free-game doc,
 * with the "current"/"next" split (claim button vs countdown overlay).
 *
 * Ported verbatim from the legacy `gamesScreen/FreeGames.tsx` card (Phase 3
 * migration). Deliberately kept legacy quirks:
 * - `t` stays a PROP (the section passes its translation function down) —
 *   the sibling cards call useTranslation themselves, this one doesn't.
 * - the itemRef/onClaimRef pattern ("stable callbacks, no item object in
 *   deps") with its rationale comment.
 * - the store icon memoizes an imperative palette read through
 *   renderStoreIcon, whose own comment is preserved.
 *
 * Type-level cleanup, silent at runtime: navigation typed against
 * `GamesStackParamList` (the legacy used `useNavigation<any>()`); the
 * GameDetails params (gameID/claimUrl/store) already match the stack's
 * contract.
 */
const FreeGameCard = React.memo<FreeGameCardProps>(({ item, onClaim, t }) => {
  const navigation = useNavigation<NativeStackNavigationProp<GamesStackParamList>>();
  const colors = useThemeColors();
  const storeIcon = useMemo(() => renderStoreIcon(item.store), [item.store]);

  const styles = useThemeStyles((c) => ({
    gameCard: {
      width: 165,
      height: CARD_HEIGHT,
      marginHorizontal: 5,
      borderRadius: 16,
      overflow: "hidden",
      position: "relative",
    },
    cardGradient: {
      position: "absolute",
      width: "100%",
      height: "100%",
    },
    imageContainer: {
      width: "100%",
      height: 200,
      position: "relative",
    },
    cover: {
      width: "100%",
      height: "100%",
    },
    imageGradient: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: "40%",
    },
    storeIconBadge: {
      position: "absolute",
      bottom: 8,
      left: 8,
      backgroundColor: c.scrim,
      borderRadius: 50,
      padding: 6,
      borderWidth: 1,
      borderColor: c.border,
    },
    infoSection: {
      flex: 1,
      padding: 12,
      justifyContent: "space-between",
    },
    title: {
      color: c.text,
      fontSize: 15,
      fontWeight: "bold",
      lineHeight: 18,
      textAlign: "center",
    },
    savingsContainer: {
      marginTop: 8,
    },
    savingsButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 10,
      gap: 6,
      elevation: 3,
      shadowColor: c.textMuted,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.4,
      shadowRadius: 3,
    },
    savingsText: {
      color: c.accentText,
      fontSize: 12,
      fontWeight: "bold",
      letterSpacing: 0.5,
    },
  }));

  // Use refs so callbacks are stable — no item object in deps
  const itemRef = React.useRef(item);
  itemRef.current = item;
  const onClaimRef = React.useRef(onClaim);
  onClaimRef.current = onClaim;

  const handleCardPress = useCallback((): void => {
    const it = itemRef.current;
    if (it.igdb_game_id) {
      // The legacy passed claimUrl/store unconditionally and got away with
      // the possibly-undefined values only because its navigation was
      // `useNavigation<any>()`; with the typed stack the same values are
      // spread only when defined (runtime-identical: the params read
      // undefined either way, exactOptionalPropertyTypes lets nothing else).
      navigation.navigate("GameDetails", {
        gameID: it.igdb_game_id,
        ...(it.url !== undefined && { claimUrl: it.url }),
        ...(it.store !== undefined && { store: it.store }),
      });
    }
  }, [navigation]);

  const handleClaimPress = useCallback((): void => {
    onClaimRef.current(itemRef.current);
  }, []);

  return (
    <TouchableOpacity
      style={styles.gameCard}
      activeOpacity={0.9}
      onPress={handleCardPress}
    >
      {/* Background gradient */}
      <LinearGradient
        colors={[colors.skeletonBase, colors.accent]}
        style={styles.cardGradient}
      />

      {/* Image area with optional countdown overlay */}
      <View style={styles.imageContainer}>
        {item.type === "next" && item.startDate && (
          <CountdownTimer t={t} startDate={item.startDate} />
        )}

        <Image
          source={
            item.image
              ? {
                  uri: `https://wsrv.nl/?url=${item.image}&w=400&q=80&output=webp`,
                }
              : require("@/assets/image-not-found.webp")
          }
          style={styles.cover}
          contentFit="cover"
          cachePolicy="memory-disk"
        />

        <LinearGradient
          colors={["transparent", colors.scrim]}
          style={styles.imageGradient}
        />

        {/* Store icon badge */}
        <View style={styles.storeIconBadge}>{storeIcon}</View>
      </View>

      <View style={styles.infoSection}>
        <CustomText style={styles.title} numberOfLines={item.type === "current" ? 2 : 4}>
          {item.title}
        </CustomText>

        {/* Claim button — only for currently available games */}
        {item.type === "current" && (
          <TouchableOpacity
            style={styles.savingsContainer}
            onPress={handleClaimPress}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={[colors.textMuted, colors.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.savingsButton}
            >
              <Gift size={16} color={colors.accentText} />
              <CustomText style={styles.savingsText}>
                {t("games.list.freeGames.claimNow")}
              </CustomText>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
});
FreeGameCard.displayName = "FreeGameCard";

export default FreeGameCard;
