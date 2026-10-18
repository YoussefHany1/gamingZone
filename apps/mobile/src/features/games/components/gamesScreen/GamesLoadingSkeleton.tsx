import React, { memo } from "react";
import { View } from "react-native";
import SkeletonFreeGames from "../../skeleton/gamesScreen/SkeletonFreeGames";
import SkeletonNewsItem from "@/src/features/news/skeleton/SkeletonNewsItem";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";

/** First-paint placeholder shown until the games feed is ready to mount. */
const GamesLoadingSkeleton = memo(() => {
  const styles = useThemeStyles(() => ({
    container: { flex: 1, padding: 16 },
    spacer: { height: 20 },
  }));

  return (
    <View style={styles.container}>
      <SkeletonFreeGames />
      <View style={styles.spacer} />
      <SkeletonNewsItem />
    </View>
  );
});

GamesLoadingSkeleton.displayName = "GamesLoadingSkeleton";

export default GamesLoadingSkeleton;
