import React, { memo } from "react";
import { View } from "react-native";
import CustomText from "@/src/components/CustomText";
import { useTranslation } from "react-i18next";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useSharedStyles } from "./shared";
import type { GameAboutProps } from "../../types";

const GameAbout: React.FC<GameAboutProps> = ({ summary }) => {
  const { t } = useTranslation();
  const sharedStyles = useSharedStyles();
  const styles = useThemeStyles((c) => ({
    summary: {
      color: c.textMuted,
      fontSize: 16,
      marginTop: 5,
      direction: "ltr" as const,
    },
  }));

  if (!summary) return null;

  return (
    <View>
      <CustomText style={sharedStyles.sectionHeader}>
        {t("games.details.about")}
      </CustomText>
      <CustomText style={styles.summary}>{summary}</CustomText>
    </View>
  );
};

export default memo(GameAbout);
