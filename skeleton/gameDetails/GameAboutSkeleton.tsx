import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import COLORS from "../../constants/colors";
import useShimmer from "./useShimmer";
import SkeletonBar from "./SkeletonBar";

// Static "About" header + shimmer text lines
const GameAboutSkeleton: React.FC = () => {
  const { t } = useTranslation();
  const shimmer = useShimmer();
  const S = (p: Parameters<typeof SkeletonBar>[0]) => <SkeletonBar shimmer={shimmer} {...p} />;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{t("games.details.about")}</Text>
      <View style={{ direction: "ltr" }}>
        <S w="100%" h={14} r={5} style={{ marginTop: 10 }} />
        <S w="95%" h={14} r={5} style={{ marginTop: 6 }} />
        <S w="88%" h={14} r={5} style={{ marginTop: 6 }} />
        <S w="93%" h={14} r={5} style={{ marginTop: 6 }} />
        <S w="75%" h={14} r={5} style={{ marginTop: 6 }} /></View>
    </View>
  );
};

export default GameAboutSkeleton;

const styles = StyleSheet.create({
  container: { marginTop: 10 },
  header: {
    color: COLORS.textLight,
    fontSize: 24,
    fontWeight: "600",
    textDecorationLine: "underline",
    marginTop: 10,
  },
});
