import React, { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import COLORS from "../../constants/colors";

interface Props {
  summary?: string;
}

const GameAbout: React.FC<Props> = ({ summary }) => {
  const { t } = useTranslation();
  if (!summary) return null;

  return (
    <View>
      <Text style={styles.detailsHeader}>{t("games.details.about")}</Text>
      <Text style={styles.summary}>{summary}</Text>
    </View>
  );
};

export default memo(GameAbout);

const styles = StyleSheet.create({
  detailsHeader: {
    color: COLORS.textLight,
    fontSize: 24,
    fontWeight: "600",
    textDecorationLine: "underline",
    marginTop: 10,
  },
  summary: {
    color: "#c1c1c1",
    fontSize: 16,
    marginTop: 5,
  },
});
