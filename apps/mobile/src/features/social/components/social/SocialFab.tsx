import React from "react";
import PressScale from "@/src/components/PressScale";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";

type SocialFabProps = {
  icon: React.ReactElement;
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

/**
 * Floating bubble button pinned to the bottom-right corner of a social
 * scene: circular accent badge with a count-spaced shadow, one per tab
 * (create group / share profile / new chat / new session).
 */
export default function SocialFab({
  icon,
  label,
  onPress,
  disabled = false,
}: SocialFabProps): React.ReactElement {
  const styles = useThemeStyles((c) => ({
    fab: {
      position: "absolute",
      right: 20,
      bottom: 54,
      width: 54,
      height: 54,
      borderRadius: 27,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.accent,
      shadowColor: c.accent,
      shadowOpacity: 0.35,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
  }));

  return (
    <PressScale
      style={styles.fab}
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      accessibilityRole="button"
    >
      {icon}
    </PressScale>
  );
}
