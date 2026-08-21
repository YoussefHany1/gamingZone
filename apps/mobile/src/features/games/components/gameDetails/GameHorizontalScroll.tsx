import React, { memo } from "react";
import CustomText from "@/src/components/CustomText";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Image } from "expo-image";
import { sharedStyles } from "./shared";
import type { GameHorizontalScrollProps } from "../../types";

const IMAGE_NOT_FOUND = require("@/assets/image-not-found.webp");

/** Returns the IGDB small cover URL for a given image_id. */
const coverUrl = (imageId: string) =>
  `https://images.igdb.com/igdb/image/upload/t_cover_small/${imageId}.webp`;

const GameHorizontalScroll: React.FC<GameHorizontalScrollProps> = ({
  title,
  games,
  onGamePress,
}) => {
  if (games.length === 0) return null;

  return (
    <View style={styles.container}>
      <CustomText style={sharedStyles.sectionHeader}>{title}</CustomText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
      >
        {games.map((game) => (
          <TouchableOpacity
            key={game.id}
            style={styles.card}
            onPress={() => onGamePress(game.id)}
          >
            <Image
              recyclingKey={game.cover?.image_id ?? ""}
              style={styles.coverImage}
              source={
                game.cover?.image_id
                  ? coverUrl(game.cover.image_id)
                  : IMAGE_NOT_FOUND
              }
              contentFit="cover"
              transition={500}
              cachePolicy="memory-disk"
              allowDownscaling
            />
            <CustomText style={styles.gameName} numberOfLines={2}>
              {game.name}
            </CustomText>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

export default memo(GameHorizontalScroll);

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
  },
  scrollView: {
    marginTop: 10,
  },
  card: {
    width: 120,
    marginRight: 12,
    alignItems: "center",
  },
  coverImage: {
    width: 120,
    height: 160,
    borderRadius: 8,
    marginBottom: 6,
  },
  gameName: {
    color: "#cfcfcf",
    fontSize: 14,
    textAlign: "center",
  },
});
