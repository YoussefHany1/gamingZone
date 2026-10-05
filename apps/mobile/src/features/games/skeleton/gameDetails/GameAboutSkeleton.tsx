import React from "react";
import { View } from "react-native";
import CustomText from "@/src/components/CustomText";
import { useTranslation } from "react-i18next";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import useShimmer from "./useShimmer";
import SkeletonBar from "./SkeletonBar";

type SProps = Omit<Parameters<typeof SkeletonBar>[0], "shimmer">;

// Static "About" header + shimmer text lines
const GameAboutSkeleton: React.FC = () => {
  const styles = useThemeStyles((c) => ({
    container: { marginTop: 10 },
    header: {
      color: c.text,
      fontSize: 24,
      fontWeight: "600",
      textDecorationLine: "underline",
      marginTop: 10,
    },
  }));

  const { t } = useTranslation();
  const shimmer = useShimmer();
  const S = (p: SProps) => <SkeletonBar shimmer={shimmer} {...p} />;

  return (
    <View style={styles.container}>
      <CustomText style={styles.header}>{t("games.details.about")}</CustomText>
      <View style={{ direction: "ltr" }}>
        <S width="100%" height={14} radius={5} style={{ marginTop: 10 }} />
        <S width="95%" height={14} radius={5} style={{ marginTop: 6 }} />
        <S width="88%" height={14} radius={5} style={{ marginTop: 6 }} />
        <S width="93%" height={14} radius={5} style={{ marginTop: 6 }} />
        <S width="75%" height={14} radius={5} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
};

export default GameAboutSkeleton;
