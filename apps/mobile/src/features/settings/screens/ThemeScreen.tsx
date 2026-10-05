import React, { memo, useCallback } from "react";
import { View, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import { Check, Monitor, Moon, Sun } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CustomText from "@/src/components/CustomText";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useThemeStore } from "@/src/store/useThemeStore";
import type { ThemeMode } from "@/src/constants/colors";

type ThemeOption = {
  mode: ThemeMode;
  labelKey: "system" | "light" | "dark";
  Icon: LucideIcon;
};

const THEME_OPTIONS: ThemeOption[] = [
  { mode: "system", labelKey: "system", Icon: Monitor },
  { mode: "light", labelKey: "light", Icon: Sun },
  { mode: "dark", labelKey: "dark", Icon: Moon },
];

const ThemeScreen = memo((): React.ReactElement => {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const mode = useThemeStore((state) => state.mode);
  const setMode = useThemeStore((state) => state.setMode);

  const styles = useThemeStyles((c) => ({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    content: {
      padding: 20,
      paddingBottom: 40,
    },
    option: {
      marginVertical: 6,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 16,
      backgroundColor: c.surface,
      borderRadius: 12,
    },
    optionLeft: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    optionIcon: {
      marginRight: 12,
    },
    optionLabel: {
      fontSize: 18,
      fontWeight: "600",
      color: c.text,
    },
  }));

  const handleSelect = useCallback((next: ThemeMode) => setMode(next), [setMode]);

  return (
    <SafeAreaView style={styles.container} edges={["right", "left"]}>
      <View style={styles.content}>
        {THEME_OPTIONS.map(({ mode: optionMode, labelKey, Icon }) => (
          <TouchableOpacity
            key={optionMode}
            style={styles.option}
            onPress={() => handleSelect(optionMode)}
            activeOpacity={0.7}
          >
            <View style={styles.optionLeft}>
              <Icon size={20} color={colors.textMuted} style={styles.optionIcon} />
              <CustomText style={styles.optionLabel}>
                {t(`settings.theme.${labelKey}`)}
              </CustomText>
            </View>
            {optionMode === mode && <Check size={24} color={colors.accentText} />}
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
});
ThemeScreen.displayName = "ThemeScreen";
export default ThemeScreen;
