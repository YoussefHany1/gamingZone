import { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import COLORS from "../../constants/colors";
import type { AgeRatingInfo, Platform } from "./types";
import { getRatingColor } from "./utils";

interface Props {
  name: string;
  releaseDate?: number; // Unix timestamp in seconds (from IGDB first_release_date)
  platforms?: Platform[];
  totalRating?: number;
  totalRatingCount?: number;
  ageRating: AgeRatingInfo | null;
}

// Maps i18next language codes to valid BCP-47 locales for Intl.DateTimeFormat
const LOCALE_MAP: Record<string, string> = {
  ar: "ar-EG",
  en: "en-US",
  fr: "fr-FR",
  de: "de-DE",
  es: "es-ES",
  ja: "ja-JP",
  zh: "zh-CN",
  pt: "pt-BR",
  ru: "ru-RU",
  ko: "ko-KR",
};

function formatReleaseDate(timestamp: number, lang: string): string {
  const locale = LOCALE_MAP[lang] ?? LOCALE_MAP[lang.split("-")[0]] ?? "en-US";
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(timestamp * 1000));
}

function GameDetailsMeta({
  name,
  releaseDate,
  platforms,
  totalRating,
  totalRatingCount,
  ageRating,
}: Props) {
  const { i18n, t } = useTranslation();

  const formattedDate =
    typeof releaseDate === "number"
      ? formatReleaseDate(releaseDate, i18n.language)
      : undefined;

  return (
    <View style={{ direction: "ltr" }}>
      <Text style={styles.title}>{name}</Text>
      {formattedDate && (
        <Text style={styles.releaseDate}>{formattedDate}</Text>
      )}

      <View style={styles.contentHeader}>
        <View style={styles.platformContainer}>
          {platforms?.map((p) => (
            <Text key={p.id} style={styles.platform}>{p.abbreviation}</Text>
          ))}
        </View>
        <View style={{ alignItems: "center", flexDirection: "column" }}>
          {totalRating ? (
            <Text style={[styles.rating, { backgroundColor: getRatingColor(totalRating / 10) }]}>
              {Math.round(totalRating) / 10}
            </Text>
          ) : (
            <Text style={[styles.rating, { backgroundColor: COLORS.secondary }]}>N/A</Text>
          )}
          {(totalRatingCount ?? 0) > 0 && (
            <Text style={styles.ratingCount}>
              {totalRatingCount} {t("games.details.userRatings", "user ratings")}
            </Text>
          )}
        </View>
      </View>

      {ageRating && (
        <View style={[styles.ageRatingBadge, { backgroundColor: ageRating.color }]}>
          <Text style={styles.ageRatingText}>{ageRating.label}</Text>
        </View>
      )}
    </View>
  );
}

export default memo(GameDetailsMeta);

const styles = StyleSheet.create({
  title: {
    color: COLORS.textLight,
    fontSize: 24,
    fontWeight: "bold",
    direction: "ltr",
  },
  releaseDate: {
    color: "gray",
    letterSpacing: 2,
    direction: "ltr",
  },
  contentHeader: {
    flexDirection: "row",
    alignItems: "center",
    direction: "ltr",
  },
  platformContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    flex: 1,
  },
  platform: {
    color: COLORS.textLight,
    fontSize: 17,
    fontWeight: "500",
    backgroundColor: "rgb(81, 105,150, 0.3)",
    paddingVertical: 3,
    paddingHorizontal: 10,
    marginRight: 10,
    marginBottom: 10,
    borderRadius: 14,
  },
  rating: {
    color: COLORS.textLight,
    textAlign: "center",
    borderRadius: 50,
    textAlignVertical: "center",
    width: 70,
    height: 70,
    fontSize: 34,
    fontWeight: "bold",
  },
  ratingCount: {
    color: "#9f9f9f",
    marginTop: 4,
  },
  ageRatingBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginRight: 22,
    marginTop: 5,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "flex-end",
    minWidth: 45,
  },
  ageRatingText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
  },
});
