import React, { memo } from "react";
import { View, TouchableOpacity } from "react-native";
import CustomText from "@/src/components/CustomText";
import { Star, Zap } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import type { GameRatingSectionProps } from "./types";

const STARS = [1, 2, 3, 4, 5];

const STAR_STYLE = { paddingHorizontal: 6 } as const;

/**
 * Five-star rating widget. Hides itself for logged-out / anonymous users —
 * auth guarding lives here so callers only need to gate on game presence.
 */
const GameRatingSection: React.FC<GameRatingSectionProps> = ({
  user,
  rating,
  onRate,
  xpOnFirstRating,
}) => {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const styles = useThemeStyles((c) => ({
    ratingSection: {
      backgroundColor: "rgba(119, 155, 221, 0.08)",
      borderRadius: 16,
      padding: 20,
      marginVertical: 15,
      alignItems: "center",
      borderWidth: 1,
      borderColor: "rgba(119, 155, 221, 0.15)",
    },
    ratingTitle: {
      color: c.text,
      fontSize: 18,
      fontWeight: "bold",
      marginBottom: 12,
    },
    starsRow: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 10,
    },
    ratingValueText: {
      color: c.textMuted,
      fontSize: 14,
      fontWeight: "600",
    },
    xpHint: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: 8,
    },
    xpHintText: {
      color: c.accentText,
      fontSize: 12,
      fontWeight: "700",
    },
  }));

  if (!user || user.isAnonymous) return null;

  return (
    <View style={styles.ratingSection}>
      <CustomText style={styles.ratingTitle}>
        {t("games.details.rateThisGame") ?? "Rate this Game"}
      </CustomText>
      <View style={styles.starsRow}>
        {STARS.map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => onRate(rating === star ? 0 : star)}
            activeOpacity={0.7}
            style={STAR_STYLE}
          >
            <Star
              size={32}
              color={colors.textMuted}
              fill={star <= rating ? colors.textMuted : "transparent"}
            />
          </TouchableOpacity>
        ))}
      </View>
      {rating > 0 && (
        <CustomText style={styles.ratingValueText}>
          {t("games.details.yourRating") ?? "Your Rating"}: {rating} / 5
        </CustomText>
      )}
      {rating === 0 && xpOnFirstRating > 0 ? (
        <View style={styles.xpHint}>
          <Zap size={13} color={colors.accentText} />
          <CustomText style={styles.xpHintText}>
            {t("gamification.xpHint", { xp: xpOnFirstRating }) ??
              `+${xpOnFirstRating} XP for your first review`}
          </CustomText>
        </View>
      ) : null}
    </View>
  );
};

export default memo(GameRatingSection);
