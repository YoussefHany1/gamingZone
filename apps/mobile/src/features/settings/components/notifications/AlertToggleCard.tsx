import React, { memo } from "react";
import { View, Switch } from "react-native";
import CustomText from "@/src/components/CustomText";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import type { AlertToggleCardProps } from "./types";

/**
 * A category-wide alert with no source list of its own — the free-games and
 * weekly-summary topics.
 */
const AlertToggleCard = memo(
  ({ icon: Icon, title, enabled, onToggle }: AlertToggleCardProps): React.ReactElement => {
    const colors = useThemeColors();

    const styles = useThemeStyles((c) => ({
      categorySection: {
        marginBottom: 20,
        backgroundColor: "rgba(119, 155, 221, 0.1)",
        borderRadius: 12,
        overflow: "hidden",
      },
      categoryHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 16,
        backgroundColor: c.surface,
      },
      categoryHeaderLeft: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
      },
      chevronIcon: {
        marginRight: 8,
      },
      categoryTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: c.text,
        marginRight: 8,
      },
      categorySwitch: {
        transform: [{ scaleX: 1.1 }, { scaleY: 1.1 }],
        marginLeft: 10,
      },
    }));

    return (
      <View style={styles.categorySection}>
        <View style={styles.categoryHeader}>
          <View style={styles.categoryHeaderLeft}>
            <Icon size={24} color={colors.accentText}style={styles.chevronIcon} />
            <CustomText style={styles.categoryTitle}>{title}</CustomText>
          </View>

          <Switch
            value={enabled}
            onValueChange={onToggle}
            trackColor={{ false: colors.backgroundDeep, true: colors.accent }}
            thumbColor={enabled ? colors.onAccent : colors.textMuted}
            style={styles.categorySwitch}
          />
        </View>
      </View>
    );
  },
);

AlertToggleCard.displayName = "AlertToggleCard";
export default AlertToggleCard;
