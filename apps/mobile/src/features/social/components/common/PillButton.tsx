import React from "react";
import { ActivityIndicator, type StyleProp, type ViewStyle } from "react-native";
import CustomText from "@/src/components/CustomText";
import PressScale from "@/src/components/PressScale";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";

/** Visual tone of a pill action. Solid tones use accent/danger fills with
 * `onAccent` labels; outline tones sit on the accent surface with their own
 * border/label color. */
export type PillButtonTone = "primary" | "secondary" | "danger" | "danger-outline";

export type PillButtonProps = {
  /** Already-translated label (i18n stays at the call site). */
  label?: string;
  /** Custom content (e.g. an icon-only pill); `label` wins when both are set. */
  children?: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  /** Blocks presses and swaps the label for a busy spinner. */
  busy?: boolean;
  tone?: PillButtonTone;
  /**
   * "menu": taller action row with bottom spacing (sheet menus).
   * "inline": tight action button (list rows, forms). Default.
   */
  variant?: "inline" | "menu";
  /** Extra styles merged last, so single-callsite tweaks stay possible. */
  style?: StyleProp<ViewStyle>;
};

/**
 * The accent pill action used across the social sheets, list rows and session
 * cards — one themed `PressScale` + label instead of a per-file style copy.
 */
export default function PillButton({
  label,
  children,
  onPress,
  disabled = false,
  busy = false,
  tone = "primary",
  variant = "inline",
  style,
}: PillButtonProps): React.ReactElement {
  const colors = useThemeColors();
  const styles = useThemeStyles((c) => ({
    base: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
      paddingHorizontal: tone === "primary" || tone === "danger" ? 12 : 11,
      borderRadius: 11,
    },
    inline: { minHeight: 36 },
    menu: { minHeight: 40, marginBottom: 14 },
    primary: { backgroundColor: c.accent },
    danger: { backgroundColor: c.danger },
    secondary: {
      backgroundColor: c.accentSurface,
      borderWidth: 1,
      borderColor: c.border,
    },
    "danger-outline": {
      backgroundColor: c.accentSurface,
      borderWidth: 1,
      borderColor: c.danger,
    },
    label: {
      color:
        tone === "primary" || tone === "danger" ? c.onAccent : tone === "secondary" ? c.text : c.danger,
      fontSize: 12,
      fontWeight: tone === "primary" || tone === "danger" ? "800" : "700",
    },
  }));

  return (
    <PressScale
      style={[styles.base, styles[variant], styles[tone], style]}
      onPress={onPress}
      disabled={disabled || busy}
    >
      {busy ? (
        <ActivityIndicator
          color={tone === "primary" || tone === "danger" ? colors.onAccent : colors.accentText}
        />
      ) : (
        children ?? <CustomText style={styles.label}>{label}</CustomText>
      )}
    </PressScale>
  );
}
