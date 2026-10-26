import React, { memo } from "react";
import { View } from "react-native";
import { Image } from "expo-image";
import CustomText from "@/src/components/CustomText";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import PlatformBadges from "../PlatformBadges";
import type { NewsArticleMetaProps } from "./types";

/** Site badge row (logo + name + relative time) and the absolute date row. */
const NewsArticleMeta = memo(function NewsArticleMeta({
  siteImage,
  siteName,
  timeAgo,
  formattedDate,
  platforms,
}: NewsArticleMetaProps) {
  const styles = useThemeStyles((c) => ({
    site: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginHorizontal: 15,
    },
    siteRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    siteImage: {
      width: 40,
      height: 40,
      borderRadius: 50,
      marginRight: 10,
    },
    siteName: {
      color: c.text,
      fontSize: 16,
    },
    date: {
      color: c.text,
      marginVertical: 20,
    },
  }));

  return (
    <>
      <View style={styles.site}>
        <View style={styles.siteRow}>
          <Image
            recyclingKey={siteImage || ""}
            style={styles.siteImage}
            source={siteImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            allowDownscaling
          />
          <CustomText style={styles.siteName}>{siteName}</CustomText>
        </View>
        <CustomText style={styles.date}>{timeAgo}</CustomText>
      </View>

      <View style={styles.site}>
        <CustomText style={styles.date}>{formattedDate}</CustomText>
      </View>

      {platforms.length > 0 && (
        <View style={styles.site}>
          <PlatformBadges platforms={platforms} variant="labeled" />
        </View>
      )}
    </>
  );
});

export default NewsArticleMeta;
