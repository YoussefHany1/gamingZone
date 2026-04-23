import React, { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import COLORS from "../constants/colors";

interface SectionTitleProps {
  title: string;
  fontSize?: number;
  subtitle?: string;
}

const SectionTitle = memo<SectionTitleProps>(({ title, fontSize = 18, subtitle }) => (
  <View style={styles.sectionHeader}>
    <View style={[styles.sectionAccent, subtitle ? { height: 35 } : undefined]} />
    <View style={styles.textContainer}>
      <Text style={[styles.sectionTitle, { fontSize }]}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    </View>
  </View>
));
SectionTitle.displayName = "SectionTitle";
export default SectionTitle;

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  sectionAccent: {
    width: 4,
    height: 20,
    borderRadius: 2,
    backgroundColor: COLORS.lightGray,
  },
  textContainer: {
    justifyContent: "center",
  },
  sectionTitle: {
    color: "#fff",
    fontWeight: "bold",
  },
  sectionSubtitle: {
    color: COLORS.lightGray,
    fontSize: 13,
    marginTop: 2,
  },
});
