import { memo } from "react";
import { View } from "react-native";
import CustomText from "@/src/components/CustomText";
import { useTranslation } from "react-i18next";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import type { GameDetailsMetaProps } from "../../types";
import { getRatingGradient } from "./utils";
import { LinearGradient } from "expo-linear-gradient";

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
  const locale = LOCALE_MAP[lang] ?? LOCALE_MAP[lang.split("-")[0] ?? "en"] ?? "en-US";

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
}: GameDetailsMetaProps) {
  const { i18n, t } = useTranslation();
  const colors = useThemeColors();

  const styles = useThemeStyles((c) => ({
    container: {
      // Force LTR layout so game metadata always reads left-to-right
      direction: "ltr",
    },
    title: {
      color: c.text,
      fontSize: 24,
      fontWeight: "bold",
      direction: "ltr",
    },
    releaseDate: {
      color: c.textSubtle,
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
    platform: {
      color: c.text,
      fontSize: 17,
      fontWeight: "500",
      backgroundColor: c.accentSurface,
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
      borderRadius: 50,
      width: 70,
      height: 70,
      justifyContent: "center",
      alignItems: "center",
    },
    ratingText: {
      color: c.text,
      fontSize: 34,
      fontWeight: "bold",
    },
    ratingCount: {
      color: c.textSubtle,
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
      color: c.text,
      fontWeight: "bold",
      fontSize: 18,
    },
  }));

  const formattedDate =
    typeof releaseDate === "number"
      ? formatReleaseDate(releaseDate, i18n.language)
      : undefined;

  // Normalise rating to a 0–10 scale with one decimal place
  const displayRating = totalRating != null ? Math.round(totalRating) / 10 : null;

  return (
    <View style={styles.container}>
      <CustomText style={styles.title}>{name}</CustomText>

      {formattedDate && (
        <CustomText style={styles.releaseDate}>{formattedDate}</CustomText>
      )}

      <View style={styles.metaRow}>
        <View style={styles.platformContainer}>
          {platforms?.map((p) => (
            <CustomText key={p.id} style={styles.platform}>
              {p.abbreviation}
            </CustomText>
          ))}
        </View>

        <View style={styles.ratingContainer}>
          {displayRating != null ? (
            <LinearGradient
              colors={getRatingGradient(displayRating)}
              style={styles.rating}
            >
              <CustomText style={styles.ratingText}>{displayRating}</CustomText>
            </LinearGradient>
          ) : (
            <View style={[styles.rating, { backgroundColor: colors.accent }]}>
              <CustomText style={styles.ratingText}>N/A</CustomText>
            </View>
          )}

          {(totalRatingCount ?? 0) > 0 && (
            <CustomText style={styles.ratingCount}>
              {totalRatingCount} {t("games.details.userRatings", "user ratings")}
            </CustomText>
          )}
        </View>
      </View>

      {ageRating && (
        <View style={[styles.ageRatingBadge, { backgroundColor: ageRating.color }]}>
          <CustomText style={styles.ageRatingText}>{ageRating.label}</CustomText>
        </View>
      )}
    </View>
  );
}

export default memo(GameDetailsMeta);
