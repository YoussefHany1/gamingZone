import React, { memo } from "react";
import { useWindowDimensions, View } from "react-native";
import Svg, { Line, Rect } from "react-native-svg";
import CustomText from "@/src/components/CustomText";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useTranslation } from "react-i18next";
import type { AdminSignupBucket } from "../types";

const CHART_HEIGHT = 132;
const BAR_RADIUS = 3;

export type AdminSignupsChartProps = {
  series: AdminSignupBucket[];
};

/**
 * Lightweight SVG bar chart — no charting dependency beyond
 * `react-native-svg`, which the app already ships for its icons.
 */
const AdminSignupsChart = memo(
  ({ series }: AdminSignupsChartProps): React.ReactElement => {
    const colors = useThemeColors();
    const { t } = useTranslation();
    const { width } = useWindowDimensions();
    const chartWidth = Math.max(200, width - 16 * 2 - 16 * 2);

    const max = Math.max(1, ...series.map((bucket) => bucket.count));
    const barSlot = chartWidth / Math.max(1, series.length);
    const barWidth = Math.max(2, barSlot * 0.62);

    const styles = useThemeStyles((c) => ({
      footer: {
        flexDirection: "row" as const,
        justifyContent: "space-between" as const,
        marginTop: 6,
      },
      axis: { color: c.textSubtle, fontSize: 10 },
      total: { color: c.textMuted, fontSize: 12, marginBottom: 8 },
    }));

    return (
      <View>
        <CustomText style={styles.total}>
          {t("admin.overview.signups.total", {
            count: series.reduce((sum, bucket) => sum + bucket.count, 0),
          })}
        </CustomText>

        <Svg width={chartWidth} height={CHART_HEIGHT}>
          <Line
            x1={0}
            y1={CHART_HEIGHT}
            x2={chartWidth}
            y2={CHART_HEIGHT}
            stroke={colors.border}
            strokeWidth={1}
          />
          {series.map((bucket, index) => {
            const height = Math.round((bucket.count / max) * (CHART_HEIGHT - 8));
            return (
              <Rect
                key={`${bucket.date}-${index}`}
                x={index * barSlot + (barSlot - barWidth) / 2}
                y={CHART_HEIGHT - height}
                width={barWidth}
                height={Math.max(bucket.count > 0 ? 2 : 0, height)}
                rx={BAR_RADIUS}
                fill={colors.accentText}
                opacity={bucket.count > 0 ? 0.9 : 0.2}
              />
            );
          })}
        </Svg>

        <View style={styles.footer}>
          <CustomText style={styles.axis}>{series[0]?.date ?? ""}</CustomText>
          <CustomText style={styles.axis}>
            {series[Math.floor(series.length / 2)]?.date ?? ""}
          </CustomText>
          <CustomText style={styles.axis}>
            {series[series.length - 1]?.date ?? ""}
          </CustomText>
        </View>
      </View>
    );
  },
);

AdminSignupsChart.displayName = "AdminSignupsChart";
export default AdminSignupsChart;
