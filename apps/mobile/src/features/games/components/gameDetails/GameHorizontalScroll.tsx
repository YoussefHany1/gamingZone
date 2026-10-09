import React, { memo, useState } from "react";
import CustomText from "@/src/components/CustomText";
import { View, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Image } from "expo-image";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useSharedStyles } from "./shared";
import type { GameHorizontalScrollProps } from "../../types";

const IMAGE_NOT_FOUND = require("@/assets/image-not-found.webp");

/** Returns the IGDB small cover URL for a given image_id. */
const coverUrl = (imageId: string) =>
  `https://images.igdb.com/igdb/image/upload/t_cover_small/${imageId}.webp`;

const HorizontalGameCard: React.FC<{
  game: any;
  onPress: (id: number) => void;
  styles: any;
  accentColor: string;
}> = memo(({ game, onPress, styles, accentColor }) => {
  const [loading, setLoading] = useState(true);

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(game.id)}>
      <View style={styles.imageContainer}>
        <Image
          recyclingKey={game.cover?.image_id ?? ""}
          style={styles.coverImage}
          source={game.cover?.image_id ? coverUrl(game.cover.image_id) : IMAGE_NOT_FOUND}
          contentFit="cover"
          transition={500}
          cachePolicy="memory-disk"
          allowDownscaling
          onLoadStart={() => setLoading(true)}
          onLoad={() => setLoading(false)}
          onError={() => setLoading(false)}
        />
        {loading && (
          <View style={styles.loaderOverlay} pointerEvents="none">
            <ActivityIndicator size="small" color={accentColor} />
          </View>
        )}
      </View>
      <CustomText style={styles.gameName} numberOfLines={2}>
        {game.name}
      </CustomText>
    </TouchableOpacity>
  );
});
HorizontalGameCard.displayName = "HorizontalGameCard";

const GameHorizontalScroll: React.FC<GameHorizontalScrollProps> = ({
  title,
  games,
  onGamePress,
}) => {
  const colors = useThemeColors();
  const sharedStyles = useSharedStyles();
  const styles = useThemeStyles((c) => ({
    container: {
      marginTop: 20,
    },
    listContainer: {
      marginTop: 10,
      minHeight: 220,
      width: "100%",
    },
    card: {
      width: 120,
      marginRight: 12,
      alignItems: "center",
    },
    imageContainer: {
      width: 120,
      height: 160,
      borderRadius: 8,
      marginBottom: 6,
      position: "relative",
      backgroundColor: c.skeletonBase,
      overflow: "hidden",
    },
    coverImage: {
      width: "100%",
      height: "100%",
    },
    loaderOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: "center",
      alignItems: "center",
    },
    gameName: {
      color: c.textMuted,
      fontSize: 14,
      textAlign: "center",
    },
  }));

  const renderItem = React.useCallback(
    ({ item: game }: { item: (typeof games)[0] }) => (
      <HorizontalGameCard
        game={game}
        onPress={onGamePress}
        styles={styles}
        accentColor={colors.accent}
      />
    ),
    [onGamePress, styles, colors.accent],
  );

  if (games.length === 0) return null;

  return (
    <View style={styles.container}>
      <CustomText style={sharedStyles.sectionHeader}>{title}</CustomText>
      <View style={styles.listContainer}>
        <FlashList
          data={games}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
        />
      </View>
    </View>
  );
};

export default memo(GameHorizontalScroll);
