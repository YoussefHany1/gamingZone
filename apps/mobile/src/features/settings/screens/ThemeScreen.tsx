import React, { memo, useCallback } from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import CustomText from "@/src/components/CustomText";
import type { AccentId, Appearance } from "@/src/constants/theme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useThemeStore } from "@/src/store/useThemeStore";
import AccentSwatchRow from "../components/theme/AccentSwatchRow";
import AppearanceTileStrip from "../components/theme/AppearanceTileStrip";
import ThemePreview from "../components/theme/ThemePreview";
import { INSET, geometry } from "../components/theme/geometry";
import { useAppearancePalettes } from "../hooks/useAppearancePalettes";

const ThemeScreen = memo((): React.ReactElement => {
  const { t } = useTranslation();

  const styles = useThemeStyles((c) => ({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    content: {
      paddingBottom: 70,
    },
    themeName: {
      fontSize: 17,
      fontWeight: "700",
      color: c.text,
      textAlign: "center",
    },
    themeNote: {
      fontSize: 12,
      lineHeight: 17,
      color: c.textMuted,
      textAlign: "center",
    },
    sectionDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
      marginHorizontal: INSET,
      marginTop: 28,
    },
  }));

  const appearance = useThemeStore((state) => state.appearance);
  const accent = useThemeStore((state) => state.accent);
  const resolvedAccent = useThemeStore((state) => state.resolvedAccent);
  const setAppearance = useThemeStore((state) => state.setAppearance);
  const setAccent = useThemeStore((state) => state.setAccent);

  const palettes = useAppearancePalettes();

  // Stable so the memoised tiles keep their memo. The switch is applied
  // synchronously: the touch feedback is a native animation, so nothing on the
  // press path has to wait for the update to be scheduled.
  const handleSelect = useCallback(
    (next: Appearance) => setAppearance(next),
    [setAppearance],
  );
  const handleSelectAccent = useCallback(
    (next: AccentId) => setAccent(next),
    [setAccent],
  );

  return (
    <SafeAreaView style={styles.container} edges={["bottom", "right", "left"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Live preview painted with the ACTIVE palette ─────────── */}
        <ThemePreview />

        {/* ── Appearance tile strip ────────────────────────────────── */}
        <AppearanceTileStrip
          appearance={appearance}
          palettes={palettes}
          onSelect={handleSelect}
        />

        {/* ── Selected name + sync note ─────────────────────────────── */}
        <View style={geometry.descBlock}>
          <CustomText style={styles.themeName}>
            {t(`settings.theme.${appearance}`)}
          </CustomText>
          <CustomText style={styles.themeNote}>{t("settings.theme.syncNote")}</CustomText>
        </View>

        {/* ── Divider ───────────────────────────────────────────────── */}
        <View style={styles.sectionDivider} />

        {/* ── Accent swatches ───────────────────────────────────────── */}
        <AccentSwatchRow
          accent={accent}
          resolvedAccent={resolvedAccent}
          onSelect={handleSelectAccent}
        />
      </ScrollView>
    </SafeAreaView>
  );
});
ThemeScreen.displayName = "ThemeScreen";
export default ThemeScreen;
