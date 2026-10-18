import React, { useCallback, memo } from "react";
import { View, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Star, Trash2 } from "lucide-react-native";
import { igdbImageUrl } from "@gaming-zone/utils";
import CustomText from "@/src/components/CustomText";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import type { GameItemProps, StackParamList } from "../../types";

/**
 * A single game row in the `list` view: cover, name, release date, a 1–5 star
 * rating control and an owner-only delete button.
 */
const GameItem = memo<GameItemProps>(({ game, onRemove, onRate }) => {
  const navigation = useNavigation<NativeStackNavigationProp<StackParamList>>();
  const colors = useThemeColors();

  const styles = useThemeStyles((c) => ({
    gameItemContainer: {
      flexDirection: "row",
      backgroundColor: c.surface,
      borderRadius: 12,
      marginTop: 24,
      padding: 10,
      alignItems: "center",
    },
    gameImage: {
      width: 80,
      height: 105,
      borderRadius: 8,
    },
    gameInfo: {
      flex: 1,
      marginLeft: 12,
    },
    gameName: {
      color: c.text,
      fontSize: 18,
      fontWeight: "600",
    },
    gameReleaseDate: {
      color: c.textSubtle,
      fontSize: 14,
      marginTop: 4,
    },
    ratingRow: {
      flexDirection: "row",
      marginTop: 4,
    },
    removeButton: {
      padding: 8,
      marginLeft: 8,
    },
  }));

  const coverUrl = game.cover_image_id
    ? {
        uri: igdbImageUrl(game.cover_image_id, "cover_small"),
      }
    : require("@/assets/image-not-found.webp");

  const handlePress = useCallback(
    () => navigation.navigate("GameDetails", { gameID: game.id }),
    [game.id, navigation],
  );

  const handleRemove = useCallback(
    () => onRemove && onRemove(game.id, game.name),
    [game.id, game.name, onRemove],
  );

  return (
    <TouchableOpacity style={styles.gameItemContainer} onPress={handlePress}>
      <Image
        recyclingKey={String(game.cover_image_id ?? "")}
        source={coverUrl}
        style={styles.gameImage}
        contentFit="cover"
        transition={500}
        cachePolicy="memory-disk"
        allowDownscaling
      />
      <View style={styles.gameInfo}>
        <CustomText style={styles.gameName} numberOfLines={2}>
          {game.name}
        </CustomText>
        <CustomText style={styles.gameReleaseDate}>
          {String(game.release_date ?? "")}
        </CustomText>
        <View style={styles.ratingRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => onRate && onRate(game.id, game.rating === star ? 0 : star)}
              disabled={!onRate}
              activeOpacity={0.7}
              style={{ paddingRight: 4, paddingVertical: 4 }}
            >
              <Star
                size={18}
                color={star <= (game.rating ?? 0) ? "#ffc107" : colors.textMuted}
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>
      {onRemove && (
        <TouchableOpacity style={styles.removeButton} onPress={handleRemove}>
          <Trash2 size={24} color={colors.danger} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
});
GameItem.displayName = "GameItem";

export default GameItem;
