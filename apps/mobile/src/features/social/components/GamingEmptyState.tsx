import { Gamepad2, type LucideIcon } from "lucide-react-native";
import { View } from "react-native";
import CustomText from "@/src/components/CustomText";
import PressScale from "./PressScale";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";

type GamingEmptyStateProps = {
  title: string;
  actionLabel?: string | undefined;
  onAction?: (() => void) | undefined;
  /** Context icon; falls back to the generic gamepad. */
  icon?: LucideIcon | undefined;
};

export default function GamingEmptyState({
  title,
  actionLabel,
  onAction,
  icon: Icon = Gamepad2,
}: GamingEmptyStateProps) {
  const colors = useThemeColors();
  const styles = useThemeStyles((c) => ({
    container: {
      alignItems: "center",
      paddingVertical: 52,
      paddingHorizontal: 24,
    },
    icon: {
      width: 72,
      height: 72,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.accentSurface,
      borderWidth: 1,
      borderColor: c.accentBorder,
      marginBottom: 16,
    },
    title: { color: c.textMuted, textAlign: "center", fontSize: 15, lineHeight: 22 },
    action: {
      marginTop: 18,
      backgroundColor: c.accent,
      borderRadius: 12,
      paddingHorizontal: 18,
      paddingVertical: 11,
    },
    actionText: { color: c.onAccent, fontWeight: "700" },
  }));
  return (
    <View style={styles.container}>
      <View style={styles.icon}>
        <Icon size={32} color={colors.accentText} />
      </View>
      <CustomText style={styles.title}>{title}</CustomText>
      {actionLabel && onAction ? (
        <PressScale style={styles.action} onPress={onAction}>
          <CustomText style={styles.actionText}>{actionLabel}</CustomText>
        </PressScale>
      ) : null}
    </View>
  );
}
