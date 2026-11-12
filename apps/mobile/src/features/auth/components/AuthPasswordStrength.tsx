import React, { memo, useMemo } from "react";
import { View } from "react-native";
import CustomText from "@/src/components/CustomText";
import { CheckCircle2, Circle } from "lucide-react-native";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useTranslation } from "react-i18next";
import {
  getStrengthScore,
  getPasswordChecks,
} from "../lib/validation";

/**
 * Real-time password checklist for the register screen.
 *
 * Rules mirror `lib/validation.ts` exactly, so a fully green checklist
 * guarantees the submit-time validation passes — no more alert-after-tap.
 */
const AuthPasswordStrength: React.FC<{ password: string }> = ({ password }) => {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const checks = useMemo(() => getPasswordChecks(password), [password]);
  const score = useMemo(() => getStrengthScore(password), [password]);

  const rules = useMemo(
    () => [
      { key: "minLength", label: t("auth.validation.checks.minLength"), ok: checks.minLength },
      { key: "hasLetter", label: t("auth.validation.checks.hasLetter"), ok: checks.hasLetter },
      { key: "hasNumber", label: t("auth.validation.checks.hasNumber"), ok: checks.hasNumber },
    ],
    [checks, t],
  );

  const styles = useThemeStyles((c) => ({
    container: { marginTop: 2, marginBottom: 10 },
    track: {
      flexDirection: "row",
      gap: 4,
      marginBottom: 8,
    },
    segment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: c.surface },
    segmentPassed: { backgroundColor: c.accentText },
    checklist: { gap: 4 },
    row: { flexDirection: "row", alignItems: "center", gap: 6 },
    labelPassed: { color: c.accentText, fontSize: 12 },
    labelIdle: { color: c.textSubtle, fontSize: 12 },
  }));

  const checklist = useMemo(
    () =>
      rules.map((rule) => (
        <View key={rule.key} style={styles.row}>
          {rule.ok ? (
            <CheckCircle2 size={14} color={colors.accentText} />
          ) : (
            <Circle size={14} color={colors.textSubtle} />
          )}
          <CustomText
            style={rule.ok ? styles.labelPassed : styles.labelIdle}
          >
            {rule.label}
          </CustomText>
        </View>
      )),
    [rules, styles, colors],
  );

  const segments = useMemo(
    () =>
      [0, 1, 2].map((index) => (
        <View
          key={index}
          style={[
            styles.segment,
            index < score && styles.segmentPassed,
          ]}
        />
      )),
    [score, styles],
  );

  // Hide entirely once the password is empty so the form stays clean.
  if (!password) return null;

  return (
    <View style={styles.container}>
      <View
        style={styles.track}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={t("auth.validation.passwordStrength")}
        accessibilityHint={t("auth.a11y.passwordStrengthHint")}
        accessibilityValue={{ min: 0, max: 3, now: score }}
      >
        {segments}
      </View>
      <View style={styles.checklist}>{checklist}</View>
    </View>
  );
};

export default memo(AuthPasswordStrength);
