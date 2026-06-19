import React, { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import COLORS from "../../constants/colors";

interface CountdownBoxProps { value: number; label: string }
const CountdownBox = memo<CountdownBoxProps>(({ value, label }) => (
  <View style={styles.countdownBox}>
    <LinearGradient
      colors={[COLORS.secondary, COLORS.primary]}
      style={styles.countdownBoxGrad}
    >
      <Text style={styles.countdownNum}>{String(value).padStart(2, "0")}</Text>
    </LinearGradient>
    <Text style={styles.countdownLabel}>{label}</Text>
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
