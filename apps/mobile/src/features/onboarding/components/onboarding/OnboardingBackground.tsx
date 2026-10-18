import React, { memo } from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { VideoView } from "expo-video";
import { useNetworkStatus } from "@/src/hooks/useNetworkStatus";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useOnboardingMedia } from "../../hooks/useOnboardingMedia";
import { SLIDE_WIDTH } from "../../lib/layout";
import { SCRIM_GRADIENT } from "./scrim";
import type { OnboardingBackgroundProps } from "./types";

/**
 * The shared video overlay behind every slide, or — offline, when the clips
 * cannot be reached — the logo on the same scrim. It owns the player so the
 * screen never has to touch the video lifecycle.
 */
const OnboardingBackground = memo(
  ({ activeIndex }: OnboardingBackgroundProps): React.ReactElement => {
    const isOffline = useNetworkStatus();
    const { player } = useOnboardingMedia(activeIndex);

    const styles = useThemeStyles((c) => ({
      container: {
        position: "absolute",
        top: 0,
        width: SLIDE_WIDTH,
        height: "100%",
        overflow: "hidden",
        backgroundColor: c.backgroundDeep,
      },
      fallback: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: c.backgroundDeep,
      },
    }));

    return (
      <View style={styles.container} pointerEvents="none">
        {isOffline ? (
          <LinearGradient colors={SCRIM_GRADIENT} style={styles.fallback}>
            <Image
              source={require("@/assets/logo.webp")}
              style={staticStyles.logo}
              contentFit="contain"
              transition={300}
              cachePolicy="memory-disk"
            />
          </LinearGradient>
        ) : (
          <VideoView
            player={player}
            style={staticStyles.video}
            contentFit="cover"
            nativeControls={false}
          />
        )}
      </View>
    );
  },
);

OnboardingBackground.displayName = "OnboardingBackground";

const staticStyles = StyleSheet.create({
  video: {
    width: "100%",
    height: "100%",
  },
  logo: {
    width: 130,
    height: 130,
  },
});

export default OnboardingBackground;
