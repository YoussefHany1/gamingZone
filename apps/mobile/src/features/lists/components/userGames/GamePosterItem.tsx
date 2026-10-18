import React, { useCallback, memo } from "react";
import { View, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Star } from "lucide-react-native";
import { igdbImageUrl } from "@gaming-zone/utils";
import CustomText from "@/src/components/CustomText";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { POSTER_CELL_STYLE } from "../../constants";
import type { GamePosterItemProps, StackParamList } from "../../types";

/**
 * A single 3:4 cover poster for the grid ("poster wall") layout. The cell width
 * is enforced by FlashList's grid layout manager, so it only needs to fill the
 * cell (`width: "100%"`); the horizontal padding supplies the gutter.
 */
const GamePosterItem = memo<GamePosterItemProps>(({ game, onRemove }) => {
  const navigation = useNavigation<NativeStackNavigationProp<StackParamList>>();

  const styles = useThemeStyles((c) => ({
    posterCell: POSTER_CELL_STYLE,
    poster: {
      width: "100%",
      aspectRatio: 3 / 4,
      borderRadius: 10,
      overflow: "hidden",
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    posterImage: {
      width: "100%",
      height: "100%",
    },
    ratingBadge: {
      position: "absolute",
      top: 6,
      start: 6,
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      backgroundColor: "rgba(0, 0, 0, 0.55)",
      borderRadius: 999,
      paddingVertical: 3,
      paddingHorizontal: 7,
    },
    ratingBadgeText: {
      color: "#ffffff",
      fontSize: 12,
      fontWeight: "700",
    },
  }));

  const coverUrl = game.cover_image_id
    ? { uri: igdbImageUrl(game.cover_image_id, "cover_big") }
    : require("@/assets/image-not-found.webp");

  const handlePress = useCallback(
    () => navigation.navigate("GameDetails", { gameID: game.id }),
    [game.id, navigation],
  );

  // Owner-only: long-press reuses the row view's confirmation flow.
  const handleLongPress = useCallback(
    () => onRemove && onRemove(game.id, game.name),
    [game.id, game.name, onRemove],
  );

  return (
    <View style={styles.posterCell}>
      <TouchableOpacity
        style={styles.poster}
        onPress={handlePress}
        onLongPress={onRemove ? handleLongPress : undefined}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={game.name}
      >
        <Image
          recyclingKey={String(game.cover_image_id ?? game.id)}
          source={coverUrl}
          style={styles.posterImage}
          contentFit="cover"
          transition={300}
          cachePolicy="memory-disk"
          allowDownscaling
        />
        {game.rating ? (
          <View style={styles.ratingBadge}>
            <Star size={12} color="#ffc107" fill="#ffc107" />
            <CustomText style={styles.ratingBadgeText}>{game.rating}</CustomText>
          </View>
        ) : null}
      </TouchableOpacity>
    </View>
  );
});
GamePosterItem.displayName = "GamePosterItem";

export default GamePosterItem;
