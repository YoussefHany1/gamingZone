import React, { memo } from "react";
import { View } from "react-native";
import ImageGallerySkeleton from "@/src/features/games/skeleton/gameDetails/ImageGallerySkeleton";
import GameDetailsMetaSkeleton from "@/src/features/games/skeleton/gameDetails/GameDetailsMetaSkeleton";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";

/** Placeholder shown while the article body loads / the first paint settles. */
const NewsDetailsSkeleton = memo(function NewsDetailsSkeleton() {
  const styles = useThemeStyles(() => ({
    root: { flex: 1 },
    meta: { padding: 15 },
  }));

  return (
    <View style={styles.root}>
      <ImageGallerySkeleton />
      <View style={styles.meta}>
        <GameDetailsMetaSkeleton />
      </View>
    </View>
  );
});

export default NewsDetailsSkeleton;
