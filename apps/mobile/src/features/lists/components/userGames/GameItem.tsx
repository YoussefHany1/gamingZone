import React, { useCallback, memo } from "react";
import { Pressable, View } from "react-native";
import AppImage from "@/src/components/AppImage";
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
    <Pressable
      style={({ pressed }) => [styles.gameItemContainer, pressed && { opacity: 0.85 }]}
      onPress={handlePress}
      android_ripple={{ color: "rgba(128,128,128,0.25)", borderless: false }}
      accessibilityRole="button"
      accessibilityLabel={game.name}
    >
      <AppImage
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
            <Pressable
              key={star}
              onPress={() => onRate && onRate(game.id, game.rating === star ? 0 : star)}
              disabled={!onRate}
              style={({ pressed }) => [
                { paddingRight: 4, paddingVertical: 4 },
                pressed && { opacity: 0.85 },
              ]}
              hitSlop={{ top: 11, bottom: 11, left: 4, right: 4 }}
              android_ripple={{
                color: "rgba(128,128,128,0.25)",
                borderless: true,
                radius: 13,
              }}
              accessibilityRole="button"
              accessibilityLabel={`${star} ${star === 1 ? "star" : "stars"}`}
            >
              <Star
                size={18}
                color={star <= (game.rating ?? 0) ? "#ffc107" : colors.textMuted}
              />
            </Pressable>
          ))}
        </View>
      </View>
      {onRemove && (
        <Pressable
          style={({ pressed }) => [styles.removeButton, pressed && { opacity: 0.85 }]}
          onPress={handleRemove}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          android_ripple={{
            color: "rgba(128,128,128,0.25)",
            borderless: true,
            radius: 20,
          }}
          accessibilityRole="button"
          accessibilityLabel="Remove"
        >
          <Trash2 size={24} color={colors.danger} />
        </Pressable>
      )}
    </Pressable>
  );
});
GameItem.displayName = "GameItem";

export default GameItem;
