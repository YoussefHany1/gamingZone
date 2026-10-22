import React, { memo } from "react";
import { View } from "react-native";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";

export type XpProgressBarProps = {
  /** How far through the level the user is, 0..1. */
  progress: number;
  /** Height of the bar. */
  height?: number;
};

/**
 * The XP progress bar.
 *
 * The fill is clipped to the bar with an overflow-hidden wrapper rather than
 * by shrinking a view, so a partially filled bar still shows the full track.
 */
const XpProgressBar = memo(
  ({ progress, height = 10 }: XpProgressBarProps): React.ReactElement => {
    const clamped = Math.max(0, Math.min(1, progress));

    const styles = useThemeStyles((c) => ({
      track: {
        height,
        borderRadius: height / 2,
        backgroundColor: c.accentSurface,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: c.border,
      },
      fill: {
        height: "100%",
        borderRadius: height / 2,
        backgroundColor: c.accent,
      },
    }));

    return (
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${clamped * 100}%` }]} />
      </View>
    );
  },
);

XpProgressBar.displayName = "XpProgressBar";
export default XpProgressBar;
