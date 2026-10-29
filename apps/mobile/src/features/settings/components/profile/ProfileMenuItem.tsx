import React, { memo } from "react";
import { TouchableOpacity, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import CustomText from "@/src/components/CustomText";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import type { ProfileMenuItemProps } from "./types";

const ProfileMenuItem = memo(
  ({ icon: Icon, label, onPress, showDivider = true }: ProfileMenuItemProps): React.ReactElement => {
    const colors = useThemeColors();

    const styles = useThemeStyles((c) => ({
      row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
      },
      iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: c.background,
      },
      label: {
        flex: 1,
        color: c.text,
        fontSize: 16,
        fontWeight: "500",
      },
      divider: {
        height: 1,
        backgroundColor: c.border,
        marginLeft: 60,
      },
    }));

    return (
      <>
        <TouchableOpacity
          style={styles.row}
          onPress={onPress}
          activeOpacity={0.8}
          accessibilityRole="button"
        >
          <View style={styles.iconContainer}>
            <Icon size={18} color={colors.textMuted} />
          </View>
          <CustomText style={styles.label}>{label}</CustomText>
          <ChevronRight size={18} color={colors.textMuted} />
        </TouchableOpacity>
        {showDivider && <View style={styles.divider} />}
      </>
    );
  },
);

ProfileMenuItem.displayName = "ProfileMenuItem";
export default ProfileMenuItem;
