import React from "react";
import { View, StyleSheet } from "react-native";
import CustomText from "@/src/components/CustomText";
import { useTranslation } from "react-i18next";
import COLORS from "@/src/constants/colors";
import useShimmer from "./useShimmer";
import SkeletonBar from "./SkeletonBar";

type SProps = Omit<Parameters<typeof SkeletonBar>[0], "shimmer">;

// 4 blocks (2×2): each with a static translated header + shimmer value lines
const GameDetailsGridSkeleton: React.FC = () => {
  const { t } = useTranslation();
  const shimmer = useShimmer();
  const S = (p: SProps) => <SkeletonBar shimmer={shimmer} {...p} />;

  const blocks = [
    t("games.details.genres"),
    t("games.details.gameModes"),
    t("games.details.developer"),
    t("games.details.publisher"),
  ];

  return (
    <View style={styles.grid}>
      {blocks.map((label) => (
        <View key={label} style={styles.block}>
          <CustomText style={styles.blockHeader}>{label}</CustomText>
          <S width="85%" height={14} radius={5} style={{ marginTop: 8 }} />
          <S width="70%" height={14} radius={5} style={{ marginTop: 6 }} />
        </View>
      ))}
    </View>
  );
};

export default GameDetailsGridSkeleton;

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 16,
  },
  block: {
    width: "50%",
    paddingRight: 10,
    marginTop: 14,
  },
  blockHeader: {
    color: COLORS.textLight,
    fontSize: 24,
    fontWeight: "600",
    textDecorationLine: "underline",
    marginTop: 10,
  },
});
