import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import COLORS from "../../constants/colors";
import useShimmer from "./useShimmer";
import SkeletonBar from "./SkeletonBar";

// Static title + shimmer tab buttons + shimmer rows
const GamePcRequirementsSkeleton: React.FC = () => {
  const { t } = useTranslation();
  const shimmer = useShimmer();
  const S = (p: Omit<Parameters<typeof SkeletonBar>[0], "shimmer">) => <SkeletonBar shimmer={shimmer} {...p} />;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>
        {t("games.details.pcRequirements") ?? "PC System Requirements"}
      </Text>

      {/* Tab buttons */}
      <View style={styles.tabRow}>
        <S w={100} h={36} r={8} />
        <S w={120} h={36} r={8} style={{ marginLeft: 8 }} />
      </View>

      {/* Rows */}
      <View style={styles.table}>
        {[1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={[
              styles.row,
              { backgroundColor: i % 2 !== 0 ? "rgba(81,105,150,0.12)" : "transparent" },
            ]}
          >
            <S w="30%" h={12} r={4} style={{ marginBottom: 4 }} />
            <S w="80%" h={14} r={5} />
          </View>
        ))}
      </View>
    </View>
  );
};

export default GamePcRequirementsSkeleton;

const styles = StyleSheet.create({
  container: { marginTop: 20, marginBottom: 10, direction: "ltr", },
  header: {
    color: COLORS.textLight,
    fontSize: 24,
    fontWeight: "600",
    textDecorationLine: "underline",
    marginTop: 10,
    marginBottom: 12,
  },
  tabRow: { flexDirection: "row", marginBottom: 10 },
  table: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(81,105,150,0.4)",
  },
  row: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(81,105,150,0.25)",
  },
});
