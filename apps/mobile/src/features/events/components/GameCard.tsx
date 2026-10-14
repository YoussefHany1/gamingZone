import { memo } from "react";
import { igdbImageUrl } from "@gaming-zone/utils";
import { View } from "react-native";
import CustomText from "@/src/components/CustomText";
import { Image } from "expo-image";
import type { GameCardProps } from "../types";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";

const GameCard = memo<GameCardProps>(({ game }) => {
  const styles = useThemeStyles((c) => ({
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
      color: c.text,
      fontSize: 11,
      textAlign: "center",
      lineHeight: 16,
    },
  }));
  return (
    <View style={styles.gameCard}>
      <Image
        recyclingKey={game.cover?.image_id ?? `game-${game.id}`}
        source={
          game.cover
            ? igdbImageUrl(game.cover.image_id, "cover_big")
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
  );
});
GameCard.displayName = "GameCard";
export default GameCard;
