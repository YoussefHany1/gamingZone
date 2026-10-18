import React, { memo } from "react";
import { View, TouchableOpacity } from "react-native";
import { LayoutGrid, LayoutList } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import type { ViewModeToggleProps } from "../../types";

/**
 * Segmented control that switches the list between the row (`list`) and the
 * poster-wall (`grid`) layouts. Purely presentational — the parent owns and
 * persists the value.
 */
const ViewModeToggle = memo<ViewModeToggleProps>(({ value, onChange }) => {
  const { t } = useTranslation();
  const colors = useThemeColors();

  const styles = useThemeStyles((c) => ({
    toggleGroup: {
      flexDirection: "row",
      alignSelf: "flex-end",
      backgroundColor: c.surface,
      borderRadius: 10,
      padding: 3,
      gap: 3,
    },
    toggleButton: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    toggleButtonActive: {
      backgroundColor: c.accent,
    },
  }));

  return (
    <View style={styles.toggleGroup}>
      <TouchableOpacity
        style={[styles.toggleButton, value === "list" && styles.toggleButtonActive]}
        onPress={() => onChange("list")}
        activeOpacity={0.7}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityState={{ selected: value === "list" }}
        accessibilityLabel={t("settings.userGames.viewList")}
      >
        <LayoutList
          size={18}
          color={value === "list" ? colors.onAccent : colors.textMuted}
        />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.toggleButton, value === "grid" && styles.toggleButtonActive]}
        onPress={() => onChange("grid")}
        activeOpacity={0.7}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityState={{ selected: value === "grid" }}
        accessibilityLabel={t("settings.userGames.viewGrid")}
      >
        <LayoutGrid
          size={18}
          color={value === "grid" ? colors.onAccent : colors.textMuted}
        />
      </TouchableOpacity>
    </View>
  );
});
ViewModeToggle.displayName = "ViewModeToggle";

export default ViewModeToggle;
