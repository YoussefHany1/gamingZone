import React, { memo } from "react";
import { View, StyleSheet } from "react-native";
import CustomText from "@/src/components/CustomText";
import { LinearGradient } from "expo-linear-gradient";
import COLORS from "@/src/constants/colors";

import type { CountdownBoxProps } from "../types";
const CountdownBox = memo<CountdownBoxProps>(({ value, label }) => (
  <View style={styles.countdownBox}>
    <LinearGradient
      colors={[COLORS.secondary, COLORS.primary]}
      style={styles.countdownBoxGrad}
    >
      <CustomText style={styles.countdownNum}>
        {String(value).padStart(2, "0")}
      </CustomText>
    </LinearGradient>
    <CustomText style={styles.countdownLabel}>{label}</CustomText>
  </View>
));
CountdownBox.displayName = "CountdownBox";
export default CountdownBox;

const styles = StyleSheet.create({
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
    color: "#fff",
    fontSize: 26,
    fontWeight: "bold",
  },
  countdownLabel: {
    color: COLORS.lightGray,
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
