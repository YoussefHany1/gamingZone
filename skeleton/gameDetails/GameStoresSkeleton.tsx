import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import COLORS from "../../constants/colors";
import useShimmer from "./useShimmer";
import SkeletonBar from "./SkeletonBar";

// Static header + shimmer store icons
const GameStoresSkeleton: React.FC = () => {
  const { t } = useTranslation();
  const shimmer = useShimmer();
  const S = (p: Omit<Parameters<typeof SkeletonBar>[0], "shimmer">) => <SkeletonBar shimmer={shimmer} {...p} />;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{t("games.details.availableStores")}</Text>
      <View style={styles.row}>
        {[1, 2, 3].map((i) => (
          <S key={i} w={60} h={60} r={12} style={{ marginRight: 10 }} />
        ))}
      </View>
    </View>
  );
};

export default GameStoresSkeleton;

const styles = StyleSheet.create({
  container: { marginTop: 16 },
  header: {
    color: COLORS.textLight,
    fontWeight: "600",
    fontSize: 24,
    marginBottom: 10,
  },
  row: { flexDirection: "row" },
});
