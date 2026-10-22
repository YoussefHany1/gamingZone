import React, { memo } from "react";
import { View } from "react-native";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import AchievementTile from "./AchievementTile";
import type { AchievementGridProps } from "../types";

/** The badge grid, two per row. */
const AchievementGrid = memo(
  ({ achievements }: AchievementGridProps): React.ReactElement => {
    const styles = useThemeStyles(() => ({
      grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
      },
    }));

    return (
      <View style={styles.grid}>
        {achievements.map((achievement) => (
          <AchievementTile key={achievement.id} achievement={achievement} />
        ))}
      </View>
    );
  },
);

AchievementGrid.displayName = "AchievementGrid";
export default AchievementGrid;
