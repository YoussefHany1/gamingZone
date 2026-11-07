import React from "react";
import { ActivityIndicator, View, type StyleProp, type ViewStyle } from "react-native";
import CustomText from "@/src/components/CustomText";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";

export type LoadingStateProps = {
  /** Optional muted line under the spinner (already translated). */
  label?: string;
  /** Spinner color: theme accent (in-list) or accent text (screens).
   * Default "accentText". */
  tone?: "accent" | "accentText";
  style?: StyleProp<ViewStyle>;
};

/** Centered loading spinner shared by screens and list loading states. */
export default function LoadingState({
  label,
  tone = "accentText",
  style,
}: LoadingStateProps): React.ReactElement {
  const colors = useThemeColors();
  const styles = useThemeStyles((c) => ({
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    },
    label: { color: c.textMuted, fontSize: 12, marginTop: 10 },
  }));

  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator color={tone === "accent" ? colors.accent : colors.accentText} />
      {label ? <CustomText style={styles.label}>{label}</CustomText> : null}
    </View>
  );
}
