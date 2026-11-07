import React from "react";
import { TouchableOpacity, type StyleProp, type ViewStyle } from "react-native";
import PressScale from "@/src/components/PressScale";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";

export type IconButtonProps = {
  /** The glyph (typically a lucide icon element with its own size/color). */
  children: React.ReactNode;
  onPress: () => void;
  /** Circle diameter. Default 40. */
  size?: number;
  /** "plain": transparent; "surface": themed surface fill. Default "plain". */
  variant?: "plain" | "surface";
  /** Draws the themed border (used by small close buttons in sheets). */
  bordered?: boolean;
  /** Press feedback: scale animation (default) or legacy opacity dimming. */
  feedback?: "scale" | "opacity";
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Round pressable icon button — back/menu/close affordances across screens
 * and sheets share this instead of re-declaring the circle styles inline.
 */
export default function IconButton({
  children,
  onPress,
  size = 40,
  variant = "plain",
  bordered = false,
  feedback = "scale",
  disabled = false,
  accessibilityLabel,
  style,
}: IconButtonProps): React.ReactElement {
  const styles = useThemeStyles((c) => ({
    circle: {
      width: size,
      height: size,
      borderRadius: size / 2,
      alignItems: "center",
      justifyContent: "center",
    },
    surface: { backgroundColor: c.surface },
    bordered: { borderWidth: 1, borderColor: c.border },
  }));

  if (feedback === "opacity") {
    return (
      <TouchableOpacity
        style={[styles.circle, variant === "surface" && styles.surface, bordered && styles.bordered, style]}
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <PressScale
      style={[styles.circle, variant === "surface" && styles.surface, bordered && styles.bordered, style]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </PressScale>
  );
}
