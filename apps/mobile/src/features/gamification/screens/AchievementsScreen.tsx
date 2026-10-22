import React, { useCallback, useMemo } from "react";
import { ScrollView, View, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import ErrorState from "@/src/components/ErrorState";
import SectionTitle from "@/src/components/SectionTitle";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useAuthUser } from "@/src/hooks/useAuthUser";
import { useUserStats } from "@/src/features/settings/hooks/useUserStats";
import AchievementGrid from "../components/AchievementGrid";
import LevelCard from "../components/LevelCard";
import { useGamification } from "../hooks/useGamification";

/**
 * The achievements screen: the level, the badges and where the XP came from.
 *
 * The counters come from the shared user-stats cache, so opening this screen
 * does not issue a second set of reads when the profile has already loaded
 * them.
 */
const AchievementsScreen = (): React.ReactElement => {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { user, isAnonymous } = useAuthUser();
  const uid = user?.uid ?? "";

  const { gamification } = useGamification(uid);
  const { refresh, refreshing } = useUserStats(uid);

  // Refresh on focus so a badge that unlocked while the user was elsewhere
  // in the app is already there when they open this screen.
  useFocusEffect(
    useCallback(() => {
      if (uid) refresh(true);
    }, [uid, refresh]),
  );

  const styles = useThemeStyles((c) => ({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: 20, paddingBottom: 60 },
    section: { marginTop: 24 },
    breakdownRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    breakdownLabel: {
      color: c.textMuted,
      fontSize: 13,
      fontWeight: "600",
    },
    breakdownAmount: {
      color: c.text,
      fontSize: 13,
      fontWeight: "700",
    },
    empty: {
      color: c.textMuted,
      fontSize: 14,
      fontWeight: "600",
      textAlign: "center",
      marginTop: 12,
    },
  }));

  const unlockedCount = useMemo(
    () => gamification?.achievements.filter((a) => a.unlocked).length ?? 0,
    [gamification],
  );

  if (isAnonymous || !user) {
    return <ErrorState message={t("common.loginRequired")} showContactButton={false} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={["right", "left"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => refresh()}
            colors={[colors.accent]}
            tintColor={colors.accent}
          />
        }
      >
        <LevelCard gamification={gamification} unlockedCount={unlockedCount} />

        <SectionTitle title={t("gamification.achievementsTitle")} />
        {gamification ? (
          <AchievementGrid achievements={gamification.achievements} />
        ) : (
          <CustomText style={styles.empty}>
            {t("gamification.loading") ?? "Loading your achievements…"}
          </CustomText>
        )}

        {gamification && gamification.breakdown.length > 0 ? (
          <View style={styles.section}>
            <SectionTitle title={t("gamification.xpBreakdownTitle")} />
            {gamification.breakdown.map((entry) => (
              <View key={entry.reason} style={styles.breakdownRow}>
                <CustomText style={styles.breakdownLabel}>
                  {t(entry.labelKey)}
                </CustomText>
                <CustomText style={styles.breakdownAmount}>
                  {t("gamification.xpAmount", { xp: entry.amount }) ??
                    `+${entry.amount} XP`}
                </CustomText>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

export default AchievementsScreen;
