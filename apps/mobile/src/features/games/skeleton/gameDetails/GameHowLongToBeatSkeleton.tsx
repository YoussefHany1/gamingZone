import React from "react";
import { View } from "react-native";
import CustomText from "@/src/components/CustomText";
import { useTranslation } from "react-i18next";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import useShimmer from "./useShimmer";
import SkeletonBar from "./SkeletonBar";

type SProps = Omit<Parameters<typeof SkeletonBar>[0], "shimmer">;

// Static title + static labels + shimmer SVG circles
const GameHowLongToBeatSkeleton: React.FC = () => {
  const styles = useThemeStyles((c) => ({
    container: { marginTop: 30 },
    header: {
      color: c.text,
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
      color: c.text,
      fontSize: 18,
      fontWeight: "600",
      textAlign: "center",
      marginBottom: 10,
    },
  }));

  const { t } = useTranslation();
  const shimmer = useShimmer();
  const S = (p: SProps) => <SkeletonBar shimmer={shimmer} {...p} />;

  const labels = [
    t("games.details.howLongToBeat.main"),
    t("games.details.howLongToBeat.mainExtra"),
    t("games.details.howLongToBeat.completionist"),
  ];

  return (
    <View style={styles.container}>
      <CustomText style={styles.header}>
        {t("games.details.howLongToBeat.title")}
      </CustomText>
      <View style={styles.row}>
        {labels.map((label) => (
          <View key={label} style={styles.block}>
            <CustomText style={styles.label}>{label}</CustomText>
            <S width={80} height={80} radius={40} style={{ marginTop: 10 }} />
            <S width={40} height={12} radius={4} style={{ marginTop: 8 }} />
          </View>
        ))}
      </View>
    </View>
  );
};

export default GameHowLongToBeatSkeleton;
