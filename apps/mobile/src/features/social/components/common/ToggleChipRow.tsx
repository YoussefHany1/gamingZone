import React from "react";
import { ScrollView, View, type StyleProp, type ViewStyle } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import CustomText from "@/src/components/CustomText";
import PressScale from "@/src/components/PressScale";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";

export type ToggleChipOption = {
  key: string;
  /** Already-translated label (i18n stays at the call site). */
  label: string;
  /** Optional leading glyph, tinted by the active state. */
  icon?: LucideIcon;
};

export type ToggleChipRowProps = {
  options: ToggleChipOption[];
  /** The active key, or null when nothing is selected. */
  value: string | null;
  /** Called with the tapped key; the caller decides replace-vs-toggle-off. */
  onChipPress: (key: string) => void;
  /**
   * "page": flex-1 chips under the list header, solid-accent active state.
   * "compact": content-width chips in a horizontal scroll (form sheets).
   */
  variant?: "page" | "compact";
  style?: StyleProp<ViewStyle>;
};

/**
 * The pill toggle row shared by the social list header (view switchers and
 * platform/country filters) and the session form's conversation picker.
 */
export default function ToggleChipRow({
  options,
  value,
  onChipPress,
  variant = "page",
  style,
}: ToggleChipRowProps): React.ReactElement {
  const colors = useThemeColors();
  const styles = useThemeStyles((c) => ({
    pageRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
    pageChip: {
      flex: 1,
      minHeight: 36,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 11,
      backgroundColor: c.accentSurface,
      borderWidth: 1,
      borderColor: c.border,
    },
    pageChipActive: { backgroundColor: c.accent, borderColor: c.accent },
    pageText: { color: c.text, fontSize: 12, fontWeight: "700" },
    pageTextActive: { color: c.onAccent },
    compactRow: { flexDirection: "row", gap: 8, paddingVertical: 2 },
    compactChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      minHeight: 38,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    compactChipActive: { backgroundColor: c.accentSurface, borderColor: c.accent },
    compactText: { color: c.textMuted, fontSize: 12, fontWeight: "700", maxWidth: 130 },
    compactTextActive: { color: c.text, fontWeight: "800" },
  }));

  const chipStyle = variant === "page" ? styles.pageChip : styles.compactChip;
  const chipActiveStyle = variant === "page" ? styles.pageChipActive : styles.compactChipActive;
  const textStyle = variant === "page" ? styles.pageText : styles.compactText;
  const textActiveStyle = variant === "page" ? styles.pageTextActive : styles.compactTextActive;

  const chips = options.map((option) => {
    const active = value === option.key;
    const Icon = option.icon;
    return (
      <PressScale
        key={option.key}
        style={[chipStyle, active && chipActiveStyle]}
        onPress={() => onChipPress(option.key)}
      >
        {Icon ? <Icon size={13} color={active ? colors.accent : colors.textMuted} /> : null}
        <CustomText style={[textStyle, active && textActiveStyle]} numberOfLines={variant === "compact" ? 1 : undefined}>
          {option.label}
        </CustomText>
      </PressScale>
    );
  });

  if (variant === "compact") {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.compactRow, style]}
      >
        {chips}
      </ScrollView>
    );
  }

  return <View style={[styles.pageRow, style]}>{chips}</View>;
}
