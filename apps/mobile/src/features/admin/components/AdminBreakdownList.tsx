import React, { memo } from "react";
import { View } from "react-native";
import CustomText from "@/src/components/CustomText";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import type { AdminBreakdownRow } from "../types";

export type AdminBreakdownListProps = {
  rows: AdminBreakdownRow[];
  emptyLabel: string;
  /** Maps machine values (e.g. `pc`) to display labels. */
  formatValue?: (value: string) => string;
};

/** Horizontal bar breakdown for platform/country distributions. */
const AdminBreakdownList = memo(
  ({ rows, emptyLabel, formatValue }: AdminBreakdownListProps): React.ReactElement => {
    const styles = useThemeStyles((c) => ({
      row: { marginBottom: 10 },
      rowHeader: {
        flexDirection: "row" as const,
        justifyContent: "space-between" as const,
        marginBottom: 4,
        gap: 8,
      },
      label: { color: c.text, fontSize: 13, flex: 1 },
      count: { color: c.textMuted, fontSize: 12, fontWeight: "600" as const },
      track: { height: 6, borderRadius: 999, backgroundColor: c.accentSurface },
      fill: { height: 6, borderRadius: 999, backgroundColor: c.accentText },
      empty: { color: c.textMuted, fontSize: 12 },
    }));

    if (rows.length === 0) {
      return <CustomText style={styles.empty}>{emptyLabel}</CustomText>;
    }

    const max = Math.max(1, ...rows.map((row) => row.count));

    return (
      <View>
        {rows.map((row) => (
          <View key={row.value} style={styles.row}>
            <View style={styles.rowHeader}>
              <CustomText style={styles.label} numberOfLines={1}>
                {formatValue ? formatValue(row.value) : row.value}
              </CustomText>
              <CustomText style={styles.count}>{row.count}</CustomText>
            </View>
            <View style={styles.track}>
              <View
                style={[styles.fill, { width: `${Math.round((row.count / max) * 100)}%` }]}
              />
            </View>
          </View>
        ))}
      </View>
    );
  },
);

AdminBreakdownList.displayName = "AdminBreakdownList";
export default AdminBreakdownList;
