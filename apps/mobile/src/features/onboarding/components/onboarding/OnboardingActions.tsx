import React, { memo } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import type { OnboardingActionsProps } from "./types";

/**
 * The footer buttons. "Skip" fades out on the last slide (it is kept in the
 * layout so the CTA does not shift), where the CTA becomes "get started".
 */
const OnboardingActions = memo(
  ({ isLast, onSkip, onNext }: OnboardingActionsProps): React.ReactElement => {
    const colors = useThemeColors();
    const { t } = useTranslation();

    const styles = useThemeStyles((c) => ({
      skipText: {
        color: c.textMuted,
        fontSize: 15,
        fontWeight: "500",
      },
      nextText: {
        color: c.onAccent,
        fontSize: 16,
        fontWeight: "700",
        letterSpacing: 0.3,
      },
    }));

    const nextGradientColors: readonly [string, string] = [colors.textMuted, colors.accent];

    return (
      <View style={staticStyles.buttonsRow}>
        <TouchableOpacity
          onPress={onSkip}
          style={[staticStyles.skipBtn, isLast && staticStyles.invisible]}
          disabled={isLast}
          activeOpacity={0.7}
        >
          <CustomText style={styles.skipText}>{t("onboarding.skip")}</CustomText>
        </TouchableOpacity>

        <TouchableOpacity onPress={onNext} style={staticStyles.nextBtn} activeOpacity={0.85}>
          <LinearGradient
            colors={nextGradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={staticStyles.nextGradient}
          >
            <CustomText style={styles.nextText}>
              {isLast ? t("onboarding.getStarted") : t("onboarding.next")}
            </CustomText>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  },
);

OnboardingActions.displayName = "OnboardingActions";

const staticStyles = StyleSheet.create({
  buttonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  skipBtn: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  invisible: {
    opacity: 0,
  },
  nextBtn: {
    borderRadius: 28,
    overflow: "hidden",
    elevation: 4,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  nextGradient: {
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 28,
  },
});

export default OnboardingActions;
