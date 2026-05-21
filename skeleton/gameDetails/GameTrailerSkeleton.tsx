import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import COLORS from "../../constants/colors";
import useShimmer from "./useShimmer";
import SkeletonBar from "./SkeletonBar";

// Static "Trailer" header + shimmer video block
const GameTrailerSkeleton: React.FC = () => {
  const { t } = useTranslation();
  const shimmer = useShimmer();
  const S = (p: Omit<Parameters<typeof SkeletonBar>[0], "shimmer">) => <SkeletonBar shimmer={shimmer} {...p} />;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{t("games.details.trailer")}</Text>
      <S w="100%" h={210} r={12} style={{ marginTop: 16 }} />
    </View>
  );
};

export default GameTrailerSkeleton;

const styles = StyleSheet.create({
  container: { marginTop: 20 },
  header: {
    color: COLORS.textLight,
    fontSize: 24,
    fontWeight: "600",
    textDecorationLine: "underline",
    marginTop: 10,
  },
});
