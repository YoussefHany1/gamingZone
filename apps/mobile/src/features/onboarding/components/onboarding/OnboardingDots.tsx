import React, { memo } from "react";
import { StyleSheet, View } from "react-native";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import type { OnboardingDotsProps } from "./types";

/** Paging dots: the "active" one is the wide, fully themed pill. */
const OnboardingDots = memo(({ count, activeIndex }: OnboardingDotsProps): React.ReactElement => {
  const styles = useThemeStyles((c) => ({
    dotActiveColor: {
      backgroundColor: c.accentText,
    },
    dotInactiveColor: {
      backgroundColor: c.accentSurface,
    },
  }));

  return (
    <View style={staticStyles.dotsRow}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[
            staticStyles.dot,
            i === activeIndex ? staticStyles.dotActive : staticStyles.dotInactive,
            i === activeIndex ? styles.dotActiveColor : styles.dotInactiveColor,
          ]}
        />
      ))}
    </View>
  );
});

OnboardingDots.displayName = "OnboardingDots";

const staticStyles = StyleSheet.create({
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
  },
  dotInactive: {
    width: 8,
  },
});

export default OnboardingDots;
