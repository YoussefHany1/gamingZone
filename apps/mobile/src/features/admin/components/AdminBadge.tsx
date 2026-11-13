import React, { memo } from "react";
import { View } from "react-native";
import CustomText from "@/src/components/CustomText";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";

export type AdminBadgeTone = "admin" | "disabled" | "verified" | "neutral";

export type AdminBadgeProps = {
  label: string;
  tone?: AdminBadgeTone;
};

const AdminBadge = memo(
  ({ label, tone = "neutral" }: AdminBadgeProps): React.ReactElement => {
    const styles = useThemeStyles((c) => {
      const tones = {
        admin: { background: c.accentSurface, border: c.accentBorder, color: c.accentText },
        disabled: {
          background: "rgba(217, 45, 32, 0.12)",
          border: "rgba(217, 45, 32, 0.35)",
          color: "#e4574b",
        },
        verified: {
          background: "rgba(34, 197, 94, 0.12)",
          border: "rgba(34, 197, 94, 0.35)",
          color: "#22c55e",
        },
        neutral: { background: c.surface, border: c.border, color: c.textMuted },
      }[tone];

      return {
        badge: {
          backgroundColor: tones.background,
          borderColor: tones.border,
          borderWidth: 1,
          borderRadius: 999,
          paddingHorizontal: 8,
          paddingVertical: 2,
          alignSelf: "flex-start" as const,
        },
        text: { color: tones.color, fontSize: 11, fontWeight: "600" as const },
      };
    });

    return (
      <View style={styles.badge}>
        <CustomText style={styles.text}>{label}</CustomText>
      </View>
    );
  },
);

AdminBadge.displayName = "AdminBadge";
export default AdminBadge;
