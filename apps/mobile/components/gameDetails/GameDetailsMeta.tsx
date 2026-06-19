import { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import COLORS from "../../constants/colors";
import type { AgeRatingInfo, Platform } from "./types";
import { getRatingColor } from "./utils";

interface Props {
  name: string;
  /** Unix timestamp in seconds (IGDB first_release_date) */
  releaseDate?: number;
  platforms?: Platform[];
  totalRating?: number;
  totalRatingCount?: number;
  ageRating: AgeRatingInfo | null;
}

// ─── i18n locale mapping ──────────────────────────────────────────────────────

/**
 * Maps i18next language codes to valid BCP-47 locales for Intl.DateTimeFormat.
 * Falls back to the base language tag, then "en-US".
 */
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
  const locale =
    LOCALE_MAP[lang] ?? LOCALE_MAP[lang.split("-")[0]] ?? "en-US";

  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(timestamp * 1000));
}

// ─── Component ────────────────────────────────────────────────────────────────

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

  // Normalise rating to a 0–10 scale with one decimal place
  const displayRating =
    totalRating != null ? Math.round(totalRating) / 10 : null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{name}</Text>

      {formattedDate && (
        <Text style={styles.releaseDate}>{formattedDate}</Text>
      )}

      <View style={styles.metaRow}>
        <View style={styles.platformContainer}>
          {platforms?.map((p) => (
            <Text key={p.id} style={styles.platform}>
              {p.abbreviation}
            </Text>
          ))}
        </View>

        <View style={styles.ratingContainer}>
          <Text
            style={[
              styles.rating,
              {
                backgroundColor:
                  displayRating != null
                    ? getRatingColor(displayRating)
                    : COLORS.secondary,
              },
            ]}
          >
            {displayRating ?? "N/A"}
          </Text>

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
  container: {
    // Force LTR layout so game metadata always reads left-to-right
    direction: "ltr",
  },
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
  metaRow: {
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
  /** BUG FIX: was `rgb(81, 105, 150, 0.3)` which is invalid — RGB does not accept alpha. */
  platform: {
    color: COLORS.textLight,
    fontSize: 17,
    fontWeight: "500",
    backgroundColor: "rgba(81, 105, 150, 0.3)",
    paddingVertical: 3,
    paddingHorizontal: 10,
    marginRight: 10,
    marginBottom: 10,
    borderRadius: 14,
  },
  ratingContainer: {
    alignItems: "center",
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
