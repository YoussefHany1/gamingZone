import React, { memo } from "react";
import { View, TouchableOpacity } from "react-native";
import {
  ChevronLeft,
  ChevronRight,
  SquareArrowOutUpLeft,
  SquareArrowOutUpRight,
} from "lucide-react-native";
import CustomText from "@/src/components/CustomText";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import type { SettingsMenuListProps } from "./types";

/** Menu rows whose target leaves the app get an "open externally" affordance. */
const EXTERNAL_ITEM_IDS = new Set(["privacy", "rate"]);

/**
 * Renders the settings menu. Rows may either navigate (they carry a label and
 * an optional icon) or embed a self-contained component of their own, which
 * renders itself with no props.
 */
const SettingsMenuList = memo(
  ({ items, isRtl }: SettingsMenuListProps): React.ReactElement => {
    const colors = useThemeColors();

    const styles = useThemeStyles((c) => ({
      menuItem: {
        marginVertical: 8,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 16,
        backgroundColor: c.surface,
        borderRadius: 12,
      },
      menuItemLeft: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
      },
      menuIcon: {
        marginRight: 8,
      },
      menuLabel: {
        fontSize: 18,
        fontWeight: "600",
        color: c.text,
      },
    }));

    return (
      <>
        {items.map((item) => {
          if (item.component) {
            const Component = item.component;
            return <Component key={item.id} />;
          }

          const Icon = item.icon;
          const isExternal = EXTERNAL_ITEM_IDS.has(item.id);
          const TrailingIcon = isExternal
            ? isRtl
              ? SquareArrowOutUpLeft
              : SquareArrowOutUpRight
            : isRtl
              ? ChevronLeft
              : ChevronRight;

          return (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                {Icon && (
                  <Icon size={20} color={colors.accentText} style={styles.menuIcon} />
                )}
                <CustomText style={styles.menuLabel}>{item.label}</CustomText>
              </View>
              <TrailingIcon size={18} color={colors.accentText} />
            </TouchableOpacity>
          );
        })}
      </>
    );
  },
);

SettingsMenuList.displayName = "SettingsMenuList";
export default SettingsMenuList;
