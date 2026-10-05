import React, { memo } from "react";
import { View } from "react-native";
import CustomText from "@/src/components/CustomText";
import { LinearGradient } from "expo-linear-gradient";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";

import type { CountdownBoxProps } from "../types";
const CountdownBox = memo<CountdownBoxProps>(({ value, label }) => {
  const colors = useThemeColors();
  const styles = useThemeStyles((c) => ({
    countdownBox: {
      alignItems: "center",
      gap: 6,
    },
    countdownBoxGrad: {
      width: 64,
      height: 64,
      borderRadius: 14,
      justifyContent: "center",
      alignItems: "center",
    },
    countdownNum: {
      color: c.text,
      fontSize: 26,
      fontWeight: "bold",
    },
    countdownLabel: {
      color: c.textMuted,
      fontSize: 11,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
  }));
  return (
    <View style={styles.countdownBox}>
      <LinearGradient
        colors={[colors.accent, colors.background]}
        style={styles.countdownBoxGrad}
      >
        <CustomText style={styles.countdownNum}>
          {String(value).padStart(2, "0")}
        </CustomText>
      </LinearGradient>
      <CustomText style={styles.countdownLabel}>{label}</CustomText>
    </View>
  );
});
CountdownBox.displayName = "CountdownBox";
export default CountdownBox;
