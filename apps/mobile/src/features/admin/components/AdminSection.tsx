import React, { memo } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { View } from "react-native";
import CustomText from "@/src/components/CustomText";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";

export type AdminSectionProps = {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Themed card wrapper used by every dashboard section. */
const AdminSection = memo(
  ({ title, subtitle, action, children, style }: AdminSectionProps): React.ReactElement => {
    const styles = useThemeStyles((c) => ({
      card: {
        backgroundColor: c.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: c.border,
        padding: 16,
        marginBottom: 14,
      },
      header: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        justifyContent: "space-between" as const,
        marginBottom: 12,
        gap: 12,
      },
      headerText: { flex: 1 },
      title: { color: c.text, fontSize: 16, fontWeight: "700" as const },
      subtitle: { color: c.textMuted, fontSize: 12, marginTop: 3 },
    }));

    return (
      <View style={[styles.card, style]}>
        {(title || action) && (
          <View style={styles.header}>
            <View style={styles.headerText}>
              {title ? <CustomText style={styles.title}>{title}</CustomText> : null}
              {subtitle ? (
                <CustomText style={styles.subtitle}>{subtitle}</CustomText>
              ) : null}
            </View>
            {action}
          </View>
        )}
        {children}
      </View>
    );
  },
);

AdminSection.displayName = "AdminSection";
export default AdminSection;
