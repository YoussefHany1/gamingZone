import React, { memo } from "react";
import { View, Text } from "react-native";
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
      <Text style={sharedStyles.sectionHeader}>{t("games.details.about")}</Text>
      <Text style={SUMMARY_STYLE}>{summary}</Text>
    </View>
  );
};

export default memo(GameAbout);
