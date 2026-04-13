import React, { memo } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
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

const GameHorizontalScroll: React.FC<Props> = ({ title, games, onGamePress }) => {
  if (games.length === 0) return null;

  return (
    <View style={{ marginTop: 20 }}>
      <Text style={styles.detailsHeader}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
        {games.map((g) => (
          <TouchableOpacity key={g.id} style={styles.similarCard} onPress={() => onGamePress(g.id)}>
            <Image
              recyclingKey={g.cover?.image_id ?? ""}
              style={styles.similarImg}
              source={g.cover?.image_id
                ? `https://images.igdb.com/igdb/image/upload/t_cover_small/${g.cover.image_id}.webp`
                : IMAGE_NOT_FOUND}
              contentFit="cover"
              transition={500}
              cachePolicy="memory-disk"
              allowDownscaling
            />
            <Text style={styles.similarName} numberOfLines={2}>{g.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

export default memo(GameHorizontalScroll);

const styles = StyleSheet.create({
  detailsHeader: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "600",
    textDecorationLine: "underline",
    marginTop: 10,
  },
  similarCard: {
    width: 120,
    marginRight: 12,
    alignItems: "center",
  },
  similarImg: {
    width: 120,
    height: 160,
    borderRadius: 8,
    marginBottom: 6,
  },
  similarName: {
    color: "#cfcfcf",
    fontSize: 14,
    textAlign: "center",
  },
});
