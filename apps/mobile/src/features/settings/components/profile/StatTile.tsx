import React, { memo } from "react";
import { View } from "react-native";
import CustomText from "@/src/components/CustomText";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import type { StatTileProps } from "./types";

/** A single statistic in the profile grid. */
const StatTile = memo(
  ({ icon: Icon, label, value, wide }: StatTileProps): React.ReactElement => {
    const colors = useThemeColors();

    const styles = useThemeStyles((c) => ({
      tile: {
        flexBasis: wide ? "100%" : "48%",
        backgroundColor: c.surface,
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: c.border,
      },
      tileWide: {
        flexGrow: 1,
      },
      row: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 6,
        gap: 8,
      },
      label: {
        color: c.textMuted,
        fontSize: 13,
        fontWeight: "600",
      },
      value: {
        color: c.text,
        fontSize: wide ? 22 : 26,
        fontWeight: "700",
      },
    }));

    return (
      <View style={[styles.tile, wide && styles.tileWide]}>
        <View style={styles.row}>
          <Icon size={16} color={colors.accentText} />
          <CustomText style={styles.label} numberOfLines={1}>
            {label}
          </CustomText>
        </View>
        <CustomText style={styles.value}>{value}</CustomText>
      </View>
    );
  },
);

StatTile.displayName = "StatTile";
export default StatTile;
