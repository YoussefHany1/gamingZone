import React, { memo } from "react";
import { View } from "react-native";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react-native";
import CustomText from "@/src/components/CustomText";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";

export type AdminKpiCardProps = {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  /** Optional trend direction for a secondary line. */
  trend?: "up" | "down";
};

/** One KPI tile in the overview grid (two per row). */
const AdminKpiCard = memo(
  ({ icon: Icon, label, value, hint, trend }: AdminKpiCardProps): React.ReactElement => {
    const styles = useThemeStyles((c) => ({
      card: {
        flexBasis: "48%" as const,
        flexGrow: 1,
        backgroundColor: c.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: c.border,
        padding: 14,
        marginBottom: 10,
      },
      row: { flexDirection: "row" as const, alignItems: "center" as const, gap: 7 },
      label: { color: c.textMuted, fontSize: 12, fontWeight: "600" as const },
      value: { color: c.text, fontSize: 24, fontWeight: "800" as const, marginTop: 8 },
      hintRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 3, marginTop: 3 },
      hint: { color: c.textSubtle, fontSize: 11 },
    }));

    const TrendIcon = trend === "down" ? ArrowDownRight : ArrowUpRight;

    return (
      <View style={styles.card}>
        <View style={styles.row}>
          <Icon size={15} color={styles.label.color} />
          <CustomText style={styles.label}>{label}</CustomText>
        </View>
        <CustomText style={styles.value}>{value}</CustomText>
        {hint ? (
          <View style={styles.hintRow}>
            {trend ? (
              <TrendIcon
                size={12}
                color={trend === "up" ? "#22c55e" : "#e4574b"}
              />
            ) : null}
            <CustomText style={styles.hint}>{hint}</CustomText>
          </View>
        ) : null}
      </View>
    );
  },
);

AdminKpiCard.displayName = "AdminKpiCard";
export default AdminKpiCard;
