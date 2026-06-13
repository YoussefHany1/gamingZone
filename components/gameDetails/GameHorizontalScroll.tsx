import React, { memo } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import COLORS from "../../constants/colors";
import { sharedStyles } from "./shared";
import type { Cover } from "./types";

interface GameItem {
  id: number;
  name: string;
  cover?: Cover;
}

interface Props {
  title: string;
  games: GameItem[];
  onGamePress: (id: number) => void;
}

const IMAGE_NOT_FOUND = require("../../assets/image-not-found.webp");

/** Returns the IGDB small cover URL for a given image_id. */
const coverUrl = (imageId: string) =>
  `https://images.igdb.com/igdb/image/upload/t_cover_small/${imageId}.webp`;

const GameHorizontalScroll: React.FC<Props> = ({ title, games, onGamePress }) => {
  if (games.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={sharedStyles.sectionHeader}>{title}</Text>
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
              source={game.cover?.image_id ? coverUrl(game.cover.image_id) : IMAGE_NOT_FOUND}
              contentFit="cover"
              transition={500}
              cachePolicy="memory-disk"
              allowDownscaling
            />
            <Text style={styles.gameName} numberOfLines={2}>{game.name}</Text>
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
