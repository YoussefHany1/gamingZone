import React, { memo } from "react";
import { View } from "react-native";
import { Lock } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { achievementIcon } from "../lib/achievementIcons";
import { useTierColor } from "../lib/tierColors";
import { ACHIEVEMENT_NAME_KEYS, TIER_LABEL_KEYS } from "../lib/achievementLabels";
import type { AchievementTileProps } from "../types";

/**
 * A single badge.
 *
 * A locked badge still shows its criterion and how far the user has got, so
 * the collection reads as a set of goals rather than a wall of grey.
 */
const AchievementTile = memo(
  ({ achievement }: AchievementTileProps): React.ReactElement => {
    const colors = useThemeColors();
    const { t } = useTranslation();
    const Icon = achievementIcon(achievement.icon);
    const tierColor = useTierColor(achievement.tier);

    const styles = useThemeStyles((c) => ({
      tile: {
        flexBasis: "48%",
        backgroundColor: c.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: c.border,
        padding: 14,
        marginBottom: 10,
        opacity: achievement.unlocked ? 1 : 0.72,
      },
      head: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      },
      iconWrap: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: c.accentSurface,
      },
      tier: {
        color: tierColor,
        fontSize: 11,
        fontWeight: "800",
        textTransform: "uppercase",
      },
      name: {
        color: c.text,
        fontSize: 14,
        fontWeight: "700",
        marginTop: 10,
      },
      progress: {
        color: c.textMuted,
        fontSize: 12,
        fontWeight: "600",
        marginTop: 4,
      },
      xp: {
        color: tierColor,
        fontSize: 12,
        fontWeight: "700",
        marginTop: 6,
      },
    }));

    const nameKey = ACHIEVEMENT_NAME_KEYS[achievement.id];

    return (
      <View style={styles.tile}>
        <View style={styles.head}>
          <View style={styles.iconWrap}>
            {achievement.unlocked ? (
              <Icon size={20} color={tierColor} />
            ) : (
              <Lock size={18} color={colors.textSubtle} />
            )}
          </View>
          <CustomText style={styles.tier}>
            {t(TIER_LABEL_KEYS[achievement.tier] ?? "gamification.tiers.bronze")}
          </CustomText>
        </View>

        <CustomText style={styles.name} numberOfLines={1}>
          {nameKey ? t(nameKey) : achievement.id}
        </CustomText>

        <CustomText style={styles.progress}>
          {achievement.unlocked
            ? (t("gamification.achievements.unlocked") ?? "Unlocked")
            : (t("gamification.achievements.progress", {
                current: achievement.current,
                target: achievement.target,
              }) ?? `${achievement.current} / ${achievement.target}`)}
        </CustomText>

        {achievement.unlocked ? (
          <CustomText style={styles.xp}>
            {t("gamification.xpReward", { xp: achievement.xp }) ??
              `+${achievement.xp} XP`}
          </CustomText>
        ) : null}
      </View>
    );
  },
);

AchievementTile.displayName = "AchievementTile";
export default AchievementTile;
