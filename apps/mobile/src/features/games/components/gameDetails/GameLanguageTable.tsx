import React, { memo } from "react";
import { View, StyleSheet } from "react-native";
import CustomText from "@/src/components/CustomText";
import { CircleCheck, FileText, Languages, Mic, Monitor } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import * as Localization from "expo-localization";
import COLORS from "@/src/constants/colors";
import { sharedStyles } from "./shared";
import { COLUMN_KEYS, type GameLanguageTableProps, type ColumnKey } from "../../types";
import type { LucideIcon } from "lucide-react-native";

const COLUMN_ICONS: Record<ColumnKey, LucideIcon> = {
  Audio: Mic,
  Subtitles: FileText,
  Interface: Monitor,
};

const COLUMN_I18N_KEYS: Record<ColumnKey, string> = {
  Audio: "games.details.languages.audio",
  Subtitles: "games.details.languages.subtitles",
  Interface: "games.details.languages.interface",
};

/** Fallback map for environments where Intl.DisplayNames is unavailable. */
const LANGUAGE_NAME_FALLBACK: Record<string, string> = {
  ar: "Arabic",
  en: "English",
  fr: "French",
  de: "German",
  es: "Spanish",
  it: "Italian",
  ja: "Japanese",
  ko: "Korean",
  ru: "Russian",
  pt: "Portuguese",
  zh: "Chinese",
};

/** Returns the English display name for a BCP-47 language code, or null. */
function getLanguageDisplayName(code: string): string | null {
  try {
    // Intl.DisplayNames is available on modern React Native hermes builds
    return new (Intl as any).DisplayNames(["en"], { type: "language" }).of(code) ?? null;
  } catch {
    return LANGUAGE_NAME_FALLBACK[code] ?? null;
  }
}

const GameLanguageTable: React.FC<GameLanguageTableProps> = ({ languageList }) => {
  const { t } = useTranslation();

  const deviceLanguageName = React.useMemo(() => {
    const code = Localization.getLocales()[0]?.languageCode;
    return code ? getLanguageDisplayName(code) : null;
  }, []);

  if (languageList.length === 0) return null;

  return (
    <View style={styles.container}>
      <CustomText style={sharedStyles.sectionHeader}>
        {t("games.details.languages.title")}
      </CustomText>

      {/* Table header */}
      <View style={styles.tableHeader}>
        <View style={styles.langHeaderCell}>
          <Languages size={18} color={COLORS.secondary} />
          <CustomText style={styles.headerCellLabel}>
            {t("games.details.languages.Language")}
          </CustomText>
        </View>

        {COLUMN_KEYS.map((key) => {
          const Icon = COLUMN_ICONS[key];
          return (
            <View key={key} style={styles.iconHeaderCell}>
              <Icon size={18} color={COLORS.secondary} />
              <CustomText style={styles.headerCellLabel}>
                {t(COLUMN_I18N_KEYS[key])}
              </CustomText>
            </View>
          );
        })}
      </View>

      {/* Table body */}
      {languageList.map((lang, index) => {
        const isDeviceLang =
          !!deviceLanguageName && lang.name.includes(deviceLanguageName);

        return (
          <View
            key={lang.name}
            style={[
              styles.tableRow,
              {
                backgroundColor:
                  index % 2 === 0 ? "rgba(81, 105, 150, 0.1)" : "transparent",
              },
            ]}
          >
            <CustomText
              style={[styles.langCell, isDeviceLang && styles.langCellHighlighted]}
            >
              {t(`games.details.languages.names.${lang.name}`, lang.name)}
            </CustomText>

            {COLUMN_KEYS.map((key) => (
              <View key={key} style={styles.checkCell}>
                {lang[key] && (
                  <CircleCheck size={20} color={COLORS.lightGray} />
                )}
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
};

export default memo(GameLanguageTable);

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginTop: 20,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.secondary,
    paddingVertical: 10,
    marginTop: 10,
    alignItems: "flex-end",
  },
  langHeaderCell: {
    flex: 2,
    marginLeft: 8,
  },
  iconHeaderCell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCellLabel: {
    color: "#9f9f9f",
    marginTop: 2,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(81, 105, 150, 0.3)",
  },
  langCell: {
    flex: 2,
    color: "#cfcfcf",
    fontSize: 15,
    fontWeight: "500",
    marginLeft: 8,
  },
  langCellHighlighted: {
    fontWeight: "bold",
    color: COLORS.textLight,
  },
  checkCell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
