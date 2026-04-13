import React, { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import COLORS from "../../constants/colors";

interface SectionTitleProps { title: string }
const SectionTitle = memo<SectionTitleProps>(({ title }) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionAccent} />
    <Text style={styles.sectionTitle}>{title}</Text>
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
  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
