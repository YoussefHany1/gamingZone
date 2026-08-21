import React, { memo } from "react";
import { View, StyleSheet } from "react-native";
import CustomText from "@/src/components/CustomText";
import { Image } from "expo-image";
import type { GameCardProps } from "../types";

const GameCard = memo<GameCardProps>(({ game }) => (
  <View style={styles.gameCard}>
    <Image
      recyclingKey={game.cover?.image_id ?? `game-${game.id}`}
      source={
        game.cover
          ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${game.cover.image_id}.webp`
          : require("@/assets/image-not-found.webp")
      }
      style={styles.gameCover}
      contentFit="cover"
      cachePolicy="memory-disk"
    />
    <CustomText style={styles.gameName} numberOfLines={2}>
      {game.name}
    </CustomText>
  </View>
));
GameCard.displayName = "GameCard";
export default GameCard;

const styles = StyleSheet.create({
  gameCard: {
    width: 100,
    marginRight: 12,
    alignItems: "center",
    gap: 6,
  },
  gameCover: {
    width: 100,
    height: 134,
    borderRadius: 10,
  },
  gameName: {
    color: "#fff",
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
  },
});
