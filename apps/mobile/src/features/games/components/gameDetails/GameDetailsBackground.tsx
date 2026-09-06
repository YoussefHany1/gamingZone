import React, { memo } from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import COLORS from "@/src/constants/colors";
import { igdbImageUrl } from "@gaming-zone/utils";

import type { GameDetailsBackgroundProps } from "../../types";

const GameDetailsBackground: React.FC<GameDetailsBackgroundProps> = ({
  coverImageId,
  currentLang,
}) => {
  const isRtl = currentLang !== "en";

  return (
    <>
      {/* Side-fade gradients that blend the cover art into the page background */}
      <View
        style={[
          styles.gradientOverlay,
          { flexDirection: isRtl ? "row-reverse" : "row" },
        ]}
      >
        <LinearGradient
          colors={["transparent", COLORS.primary]}
          style={styles.gradient}
          start={{ x: 1, y: 0.5 }}
          end={{ x: 0, y: 0.5 }}
        />
        <LinearGradient
          colors={[COLORS.primary, "transparent"]}
          style={styles.gradient}
          start={{ x: 1, y: 0.5 }}
          end={{ x: 0, y: 0.5 }}
        />
      </View>

      {/* Blurred background image using expo-image for proper memory management */}
      <Image
        {...(coverImageId && { source: { uri: igdbImageUrl(coverImageId, "720p") } })}
        style={styles.bgImage}
        contentFit="cover"
        blurRadius={2}
        cachePolicy="memory-disk"
        allowDownscaling
      />
    </>
  );
};

export default memo(GameDetailsBackground);

const styles = StyleSheet.create({
  gradientOverlay: {
    justifyContent: "space-between",
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  gradient: {
    height: "100%",
    width: "50%",
  },
  bgImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -100,
    marginTop: 350,
    backgroundColor: COLORS.primary,
    opacity: 0.4,
  },
});
