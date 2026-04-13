import React, { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import COLORS from "../../constants/colors";
import type { LangRow } from "./types";

interface Props {
  languageList: LangRow[];
}

const ICONS = ["mic", "document-text", "desktop"] as const;

const GameLanguageTable: React.FC<Props> = ({ languageList }) => {
  const { t } = useTranslation();

  if (languageList.length === 0) return null;

  return (
    <View style={[styles.textCard, { width: "100%", marginTop: 20 }]}>
      <Text style={styles.detailsHeader}>{t("games.details.languages.title")}</Text>
      <View style={styles.langTableHeader}>
        <View style={styles.langHeaderCell}>
          <Ionicons name="language" size={18} color={COLORS.secondary} />
          <Text style={styles.langHeaderCellText}>{t("games.details.languages.Language")}</Text>
        </View>
        {ICONS.map((icon, i) => (
          <View key={icon} style={styles.iconHeaderContainer}>
            <Ionicons name={icon} size={18} color={COLORS.secondary} />
            <Text style={styles.headerLabel}>
              {t(["games.details.languages.audio", "games.details.languages.subtitles", "games.details.languages.interface"][i])}
            </Text>
          </View>
        ))}
      </View>
      {languageList.map((lang, index) => (
        <View key={lang.name} style={[styles.langTableRow, {
          backgroundColor: index % 2 === 0 ? "rgba(81, 105, 150, 0.1)" : "transparent",
        }]}>
          <Text style={[styles.langCellText, { flex: 2 }]}>{lang.name}</Text>
          {(["Audio", "Subtitles", "Interface"] as const).map((key) => (
            <View key={key} style={styles.checkCell}>
              {lang[key] && <Ionicons name="checkmark-circle" size={20} color={COLORS.lightGray} />}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
};

export default memo(GameLanguageTable);

const styles = StyleSheet.create({
  textCard: {
    width: "50%",
  },
  detailsHeader: {
    color: COLORS.textLight,
    fontSize: 24,
    fontWeight: "600",
    textDecorationLine: "underline",
    marginTop: 10,
  },
  langTableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.secondary,
    paddingVertical: 10,
    marginTop: 10,
    alignItems: "flex-end",
  },
  iconHeaderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerLabel: {
    color: "#9f9f9f",
    marginTop: 2,
  },
  langHeaderCell: {
    flex: 2,
    marginLeft: 8,
  },
  langHeaderCellText: {
    color: "#9f9f9f",
  },
  langTableRow: {
    flexDirection: "row",
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(81, 105, 150, 0.3)",
  },
  langCellText: {
    color: "#cfcfcf",
    fontSize: 15,
    fontWeight: "500",
    marginLeft: 8,
  },
  checkCell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
