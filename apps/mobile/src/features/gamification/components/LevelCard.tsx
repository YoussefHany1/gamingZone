import React, { memo } from "react";
import { View, TouchableOpacity } from "react-native";
import { ChevronRight, Sparkles } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import XpProgressBar from "./XpProgressBar";
import type { LevelCardProps } from "../types";

/**
 * The level card on the profile: the level badge, the XP bar and how far the
 * user is from the next level.
 */
const LevelCard = memo(
  ({ gamification, unlockedCount, onPress }: LevelCardProps): React.ReactElement => {
    const colors = useThemeColors();
    const { t } = useTranslation();

    const styles = useThemeStyles((c) => ({
      card: {
        backgroundColor: c.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: c.border,
        padding: 16,
        marginBottom: 20,
      },
      header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      },
      levelRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
      },
      badge: {
        width: 46,
        height: 46,
        borderRadius: 23,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: c.accent,
      },
      badgeText: {
        color: c.onAccent,
        fontSize: 20,
        fontWeight: "800",
      },
      levelLabel: {
        color: c.text,
        fontSize: 17,
        fontWeight: "700",
      },
      xpLabel: {
        color: c.textMuted,
        fontSize: 13,
        fontWeight: "600",
        marginTop: 2,
      },
      achievementsBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
      },
      achievementsText: {
        color: c.accentText,
        fontSize: 13,
        fontWeight: "700",
      },
      barWrap: {
        marginTop: 14,
      },
      footer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 8,
      },
      toNext: {
        color: c.textMuted,
        fontSize: 12,
        fontWeight: "600",
      },
      total: {
        color: c.text,
        fontSize: 12,
        fontWeight: "700",
      },
    }));

    if (!gamification) {
      return (
        <View style={styles.card}>
          <CustomText style={styles.levelLabel}>
            {t("gamification.loading") ?? "Loading your level…"}
          </CustomText>
        </View>
      );
    }

    const { level, totalXp, xpIntoLevel, xpToNextLevel, levelProgress } = gamification;

    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.levelRow}>
            <View style={styles.badge}>
              <CustomText style={styles.badgeText}>{level}</CustomText>
            </View>
            <View>
              <CustomText style={styles.levelLabel}>
                {t("gamification.level", { level }) ?? `Level ${level}`}
              </CustomText>
              <CustomText style={styles.xpLabel}>
                {t("gamification.xpToNextLevel", {
                  xp: Math.max(0, xpToNextLevel - xpIntoLevel),
                  level: level + 1,
                }) ?? `${xpToNextLevel - xpIntoLevel} XP to Level ${level + 1}`}
              </CustomText>
            </View>
          </View>

          {onPress ? (
            <TouchableOpacity
              style={styles.achievementsBtn}
              onPress={onPress}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={
                t("gamification.achievementsTitle") ?? "Achievements"
              }
            >
              <Sparkles size={15} color={colors.accentText} />
              <CustomText style={styles.achievementsText}>
                {unlockedCount}
              </CustomText>
              <ChevronRight size={15} color={colors.accentText} />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.barWrap}>
          <XpProgressBar progress={levelProgress} />
        </View>

        <View style={styles.footer}>
          <CustomText style={styles.toNext}>
            {t("gamification.xpIntoLevel", {
              xp: xpIntoLevel,
              xpTotal: xpToNextLevel,
            }) ?? `${xpIntoLevel} / ${xpToNextLevel} XP`}
          </CustomText>
          <CustomText style={styles.total}>
            {t("gamification.totalXp", { xp: totalXp }) ?? `${totalXp} XP`}
          </CustomText>
        </View>
      </View>
    );
  },
);

LevelCard.displayName = "LevelCard";
export default LevelCard;
