import React from "react";
import { View, StyleSheet } from "react-native";
import SkeletonItem from "@/src/components/SkeletonItem";
import { usePulseAnimation } from "@/src/components/skeleton/shared";

const CELL_GAP = 5;
const ROWS = 6;
const ROW_LIST_ROWS = 3;
const ROW_HEIGHT = 44;

/**
 * Placeholder matching the release calendar's layout: a 6x7 month grid, a
 * header bar, and a short list of the rows that will render below it.
 */
const SkeletonReleaseCalendar: React.FC = () => {
  const animatedStyle = usePulseAnimation();

  return (
    <View style={styles.container}>
      {/* Month heading + nav arrows */}
      <View style={styles.headerRow}>
        <SkeletonItem animatedStyle={animatedStyle} style={styles.headingBlock} />
        <View style={styles.navGroup}>
          <SkeletonItem animatedStyle={animatedStyle} style={styles.navButton} />
          <SkeletonItem animatedStyle={animatedStyle} style={styles.navButton} />
        </View>
      </View>

      {/* Weekday labels */}
      <View style={styles.weekdayRow}>
        {Array.from({ length: 7 }, (_, i) => (
          <SkeletonItem key={i} animatedStyle={animatedStyle} style={styles.weekdayCell} />
        ))}
      </View>

      {/* 6x7 day grid */}
      {Array.from({ length: ROWS }, (_, row) => (
        <View key={row} style={styles.gridRow}>
          {Array.from({ length: 7 }, (_, col) => (
            <SkeletonItem key={col} animatedStyle={animatedStyle} style={styles.dayCell} />
          ))}
        </View>
      ))}

      {/* Selected-day game rows */}
      {Array.from({ length: ROW_LIST_ROWS }, (_, i) => (
        <View key={`row-${i}`} style={styles.listRow}>
          <SkeletonItem animatedStyle={animatedStyle} style={styles.coverBlock} />
          <View style={styles.listTextGroup}>
            <SkeletonItem animatedStyle={animatedStyle} style={styles.titleBlock} />
            <SkeletonItem animatedStyle={animatedStyle} style={styles.metaBlock} />
          </View>
        </View>
      ))}
    </View>
  );
};

export default React.memo(SkeletonReleaseCalendar);

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 18,
    marginTop: 10,
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headingBlock: { width: 170, height: 26, borderRadius: 8 },
  navGroup: { flexDirection: "row", gap: 8 },
  navButton: { width: 30, height: 30, borderRadius: 8 },
  weekdayRow: {
    flexDirection: "row",
    columnGap: CELL_GAP,
    marginBottom: 6,
  },
  weekdayCell: { flex: 1, height: 12, borderRadius: 4 },
  gridRow: {
    flexDirection: "row",
    columnGap: CELL_GAP,
    marginBottom: CELL_GAP,
  },
  dayCell: {
    flex: 1,
    height: ROW_HEIGHT,
    borderRadius: 10,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  coverBlock: { width: 42, height: 42, borderRadius: 8 },
  listTextGroup: { flex: 1, marginLeft: 10, gap: 6 },
  titleBlock: { width: "70%", height: 14, borderRadius: 4 },
  metaBlock: { width: "40%", height: 11, borderRadius: 4 },
});
