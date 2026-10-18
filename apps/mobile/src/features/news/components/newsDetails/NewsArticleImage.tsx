import React, { memo } from "react";
import { Image } from "expo-image";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import type { NewsArticleImageProps } from "./types";

/** Article hero image, with a source-referer header to satisfy hotlink checks. */
const NewsArticleImage = memo(function NewsArticleImage({
  thumbnail,
}: NewsArticleImageProps) {
  const styles = useThemeStyles(() => ({
    image: {
      width: "100%",
      height: 300,
      resizeMode: "cover",
    },
  }));

  return (
    <Image
      style={styles.image}
      recyclingKey={thumbnail || ""}
      source={
        thumbnail
          ? {
              uri: thumbnail,
              headers: {
                Referer: "https://www.saudigamer.com/",
                "User-Agent": "Mozilla/5.0 (Linux; Android 10)",
              },
            }
          : require("@/assets/image-not-found.webp")
      }
      contentFit="cover"
      cachePolicy="memory-disk"
      allowDownscaling
    />
  );
});

export default NewsArticleImage;
