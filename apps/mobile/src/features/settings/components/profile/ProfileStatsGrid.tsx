import React, { memo } from "react";
import { View } from "react-native";
import { Check, Clock, Layers, ListChecks, Play, Star } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import StatTile from "./StatTile";
import type { ProfileStatsGridProps } from "./types";

/** The six-cell statistics grid plus the full-width playtime tile. */
const ProfileStatsGrid = memo(
  ({ stats }: ProfileStatsGridProps): React.ReactElement => {
    const { t } = useTranslation();

    const styles = useThemeStyles(() => ({
      statGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
      },
    }));

    return (
      <>
        <View style={styles.statGrid}>
          <StatTile
            icon={Play}
            label={t("settings.profileShowcase.stats.playing")}
            value={String(stats?.counts.playing ?? 0)}
          />
          <StatTile
            icon={Check}
            label={t("settings.profileShowcase.stats.played")}
            value={String(stats?.counts.played ?? 0)}
          />
          <StatTile
            icon={ListChecks}
            label={t("settings.profileShowcase.stats.wantToPlay")}
            value={String(stats?.counts.wantToPlay ?? 0)}
          />
          <StatTile
            icon={Star}
            label={t("settings.profileShowcase.stats.rated")}
            value={String(stats?.ratedCount ?? 0)}
          />
          <StatTile
            icon={Layers}
            label={t("settings.profileShowcase.stats.total")}
            value={String(stats?.counts.totalUnique ?? 0)}
          />
          <StatTile
            icon={Star}
            label={t("settings.profileShowcase.stats.avgRating")}
            value={
              stats?.averageRating != null
                ? `${stats.averageRating} / 5`
                : t("settings.profileShowcase.dash")
            }
          />
        </View>

        <StatTile
          icon={Clock}
          label={t("settings.profileShowcase.stats.playtime")}
          value={t("settings.profileShowcase.playtimeValue", {
            count: stats?.playtimeHours ?? 0,
          })}
          wide
        />
      </>
    );
  },
);

ProfileStatsGrid.displayName = "ProfileStatsGrid";
export default ProfileStatsGrid;
