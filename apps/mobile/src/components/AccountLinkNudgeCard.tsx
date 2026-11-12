import React, { memo, useCallback, useState } from "react";
import { View } from "react-native";
import { X, Link2 } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import CustomText from "./CustomText";
import PressScale from "./PressScale";
import { storage } from "@/src/lib/storage";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";

type Props = {
  /** Unique key suffix so dismissal is tracked per placement (e.g. "profile", "achievements"). */
  surface: string;
  onPress: () => void;
};

const AccountLinkNudgeCard: React.FC<Props> = ({ surface, onPress }) => {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const storageKey = `@link_nudge_dismissed_${surface}`;
  const [dismissed, setDismissed] = useState(() => storage.getString(storageKey) === "true");

  const handleDismiss = useCallback(() => {
    storage.set(storageKey, "true");
    setDismissed(true);
  }, [storageKey]);

  const styles = useThemeStyles((c) => ({
    card: {
      backgroundColor: c.accentSurface,
      borderWidth: 1,
      borderColor: c.accentBorder,
      borderRadius: 14,
      padding: 14,
      marginBottom: 16,
    },
    row: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: c.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    body: { flex: 1 },
    title: { color: c.text, fontSize: 15, fontWeight: "700", marginBottom: 4 },
    message: { color: c.textMuted, fontSize: 13, lineHeight: 18 },
    cta: {
      marginTop: 10,
      alignSelf: "flex-start",
      backgroundColor: c.accent,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
    },
    ctaText: { color: c.onAccent, fontWeight: "700", fontSize: 13 },
    close: { padding: 2 },
  }));

  if (dismissed) return null;

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <Link2 size={18} color={colors.accentText} />
        </View>
        <View style={styles.body}>
          <CustomText style={styles.title}>{t("linking.nudge.title")}</CustomText>
          <CustomText style={styles.message}>{t("linking.nudge.message")}</CustomText>
          <PressScale style={styles.cta} onPress={onPress}>
            <CustomText style={styles.ctaText}>{t("linking.nudge.cta")}</CustomText>
          </PressScale>
        </View>
        <PressScale
          style={styles.close}
          onPress={handleDismiss}
          accessibilityRole="button"
          accessibilityLabel={t("common.close")}
        >
          <X size={18} color={colors.textMuted} />
        </PressScale>
      </View>
    </View>
  );
};

export default memo(AccountLinkNudgeCard);
