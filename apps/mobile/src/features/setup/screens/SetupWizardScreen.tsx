import React, { memo, useEffect, useMemo } from "react";
import analytics from "@react-native-firebase/analytics";
import { View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Gamepad2, Monitor, Smartphone } from "lucide-react-native";
import CustomText from "@/src/components/CustomText";
import PressScale from "@/src/components/PressScale";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import SelectablePill from "../components/SelectablePill";
import { SETUP_GENRES, SETUP_PLATFORMS } from "../constants";
import { useSetupFlow } from "../hooks/useSetupFlow";

interface Props {
  onDone: () => void;
}

const platformIcon = (id: string) => {
  switch (id) {
    case "pc":
      return Monitor;
    case "mobile":
      return Smartphone;
    default:
      return Gamepad2;
  }
};

const SetupWizardScreen: React.FC<Props> = memo(({ onDone }) => {
  const { t } = useTranslation();
  const colors = useThemeColors();

  useEffect(() => {
    try {
      void analytics().logEvent("setup_started");
    } catch {
      // non-fatal
    }
  }, []);

  const {
    step,
    platforms,
    genres,
    saving,
    togglePlatform,
    toggleGenre,
    next,
    skip,
  } = useSetupFlow(onDone);

  const styles = useThemeStyles((c) => ({
    container: { flex: 1, backgroundColor: c.background },
    content: { flex: 1, paddingHorizontal: 20, paddingTop: 24 },
    title: {
      fontSize: 28,
      fontWeight: "700",
      color: c.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 15,
      lineHeight: 22,
      color: c.textMuted,
      marginBottom: 24,
    },
    pillsWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginHorizontal: -6,
    },
    footer: {
      paddingHorizontal: 20,
      paddingBottom: 16,
      paddingTop: 12,
      gap: 10,
    },
    primaryBtn: {
      backgroundColor: c.accent,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
    },
    primaryText: { color: c.onAccent, fontSize: 16, fontWeight: "700" },
    skipBtn: {
      alignItems: "center",
      paddingVertical: 10,
    },
    skipText: { color: c.textMuted, fontSize: 15, fontWeight: "600" },
    hint: { color: c.textSubtle, fontSize: 13, marginBottom: 12 },
  }));

  const title =
    step === "platforms" ? t("setup.platforms.title") : t("setup.genres.title");
  const subtitle =
    step === "platforms"
      ? t("setup.platforms.subtitle")
      : t("setup.genres.subtitle");

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom", "left", "right"]}>
      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 24 }}>
        <CustomText style={styles.title}>{title}</CustomText>
        <CustomText style={styles.subtitle}>{subtitle}</CustomText>
        {step === "genres" ? (
          <CustomText style={styles.hint}>{t("setup.genres.hint")}</CustomText>
        ) : null}

        <View style={styles.pillsWrap}>
          {step === "platforms"
            ? SETUP_PLATFORMS.map((p) => {
                const Icon = platformIcon(p.id);
                const selected = platforms.includes(p.id);
                return (
                  <PressScale
                    key={p.id}
                    onPress={() => togglePlatform(p.id)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: selected ? colors.accent : colors.border,
                      backgroundColor: selected ? colors.accentSurface : colors.surface,
                      margin: 6,
                      gap: 8,
                    }}
                  >
                    <Icon
                      size={16}
                      color={selected ? colors.accentText : colors.textMuted}
                    />
                    <CustomText
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: selected ? colors.accentText : colors.text,
                      }}
                    >
                      {t(p.labelKey)}
                    </CustomText>
                  </PressScale>
                );
              })
            : SETUP_GENRES.map((g) => (
                <SelectablePill
                  key={g.id}
                  label={t(g.labelKey)}
                  selected={genres.includes(g.id)}
                  onPress={() => toggleGenre(g.id)}
                />
              ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PressScale
          style={[styles.primaryBtn, saving && { opacity: 0.7 }]}
          onPress={next}
          disabled={saving}
        >
          <CustomText style={styles.primaryText}>
            {step === "platforms" ? t("setup.continue") : t("setup.finish")}
          </CustomText>
        </PressScale>
        <PressScale style={styles.skipBtn} onPress={skip} disabled={saving}>
          <CustomText style={styles.skipText}>{t("setup.skip")}</CustomText>
        </PressScale>
      </View>
    </SafeAreaView>
  );
});

SetupWizardScreen.displayName = "SetupWizardScreen";

export default SetupWizardScreen;
