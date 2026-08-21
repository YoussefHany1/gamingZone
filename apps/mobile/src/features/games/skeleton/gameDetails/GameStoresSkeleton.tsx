import React from "react";
import { View, StyleSheet } from "react-native";
import CustomText from "@/src/components/CustomText";
import { useTranslation } from "react-i18next";
import COLORS from "@/src/constants/colors";
import useShimmer from "./useShimmer";
import SkeletonBar from "./SkeletonBar";

type SProps = Omit<Parameters<typeof SkeletonBar>[0], "shimmer">;

// Static header + shimmer store icons
const GameStoresSkeleton: React.FC = () => {
  const { t } = useTranslation();
  const shimmer = useShimmer();
  const S = (p: SProps) => <SkeletonBar shimmer={shimmer} {...p} />;

  return (
    <View style={styles.container}>
      <CustomText style={styles.header}>{t("games.details.availableStores")}</CustomText>
      <View style={styles.row}>
        {[1, 2, 3].map((i) => (
          <S key={i} width={60} height={60} radius={12} style={{ marginRight: 10 }} />
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
