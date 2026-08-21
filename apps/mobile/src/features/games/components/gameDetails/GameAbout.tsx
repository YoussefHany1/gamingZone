import React, { memo } from "react";
import { View } from "react-native";
import CustomText from "@/src/components/CustomText";
import { useTranslation } from "react-i18next";
import { sharedStyles } from "./shared";
import type { GameAboutProps } from "../../types";

const SUMMARY_STYLE = {
  color: "#c1c1c1",
  fontSize: 16,
  marginTop: 5,
  direction: "ltr" as const,
} as const;

const GameAbout: React.FC<GameAboutProps> = ({ summary }) => {
  const { t } = useTranslation();

  if (!summary) return null;

  return (
    <View>
      <CustomText style={sharedStyles.sectionHeader}>
        {t("games.details.about")}
      </CustomText>
      <CustomText style={SUMMARY_STYLE}>{summary}</CustomText>
    </View>
  );
};

export default memo(GameAbout);
