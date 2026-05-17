import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import COLORS from "../../constants/colors";
import useShimmer from "./useShimmer";
import SkeletonBar from "./SkeletonBar";

// Static title + static labels + shimmer SVG circles
const GameHowLongToBeatSkeleton: React.FC = () => {
  const { t } = useTranslation();
  const shimmer = useShimmer();
  const S = (p: Parameters<typeof SkeletonBar>[0]) => <SkeletonBar shimmer={shimmer} {...p} />;

  const labels = [
    t("games.details.howLongToBeat.main"),
    t("games.details.howLongToBeat.mainExtra"),
    t("games.details.howLongToBeat.completionist"),
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{t("games.details.howLongToBeat.title")}</Text>
      <View style={styles.row}>
        {labels.map((label) => (
          <View key={label} style={styles.block}>
            <Text style={styles.label}>{label}</Text>
            <S w={80} h={80} r={40} style={{ marginTop: 10 }} />
            <S w={40} h={12} r={4} style={{ marginTop: 8 }} />
          </View>
        ))}
      </View>
    </View>
  );
};

export default GameHowLongToBeatSkeleton;

const styles = StyleSheet.create({
  container: { marginTop: 30 },
  header: {
    color: COLORS.textLight,
    fontSize: 24,
    fontWeight: "600",
    textDecorationLine: "underline",
    marginTop: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    marginTop: 16,
    marginBottom: 40,
  },
  block: { alignItems: "center", marginHorizontal: 14 },
  label: {
    color: COLORS.textLight,
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 10,
  },
});
