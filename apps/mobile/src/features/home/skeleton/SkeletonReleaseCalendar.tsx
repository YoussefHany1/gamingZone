import React from "react";
import { View, StyleSheet } from "react-native";
import SkeletonItem from "@/src/components/SkeletonItem";
import { usePulseAnimation } from "@/src/components/skeleton/shared";

const ROWS = 6;
const ROW_LIST_ROWS = 3;
const ROW_HEIGHT = 46;

/**
 * Placeholder matching the release calendar's layout: a bordered month sheet
 * (nav bar, weekday band, 6x7 day grid) followed by the selected-day panel with
 * a short list of the rows that will render inside it.
 */
const SkeletonReleaseCalendar: React.FC = () => {
  const animatedStyle = usePulseAnimation();

  return (
    <View style={styles.container}>
      {/* Section heading */}
      <SkeletonItem animatedStyle={animatedStyle} style={styles.headingBlock} />

      {/* ── Month sheet ── */}
      <View style={styles.card}>
        {/* Month nav: prev chevron, month name, next chevron */}
        <View style={styles.monthNav}>
          <SkeletonItem animatedStyle={animatedStyle} style={styles.navButton} />
          <SkeletonItem animatedStyle={animatedStyle} style={styles.monthBlock} />
          <SkeletonItem animatedStyle={animatedStyle} style={styles.navButton} />
        </View>

        {/* Weekday header band */}
        <View style={styles.weekdayRow}>
          {Array.from({ length: 7 }, (_, i) => (
            <SkeletonItem
              key={i}
              animatedStyle={animatedStyle}
              style={styles.weekdayCell}
            />
          ))}
        </View>

        {/* 6x7 day grid, with a hairline between each week */}
        {Array.from({ length: ROWS }, (_, row) => (
          <View key={row} style={[styles.gridRow, row < ROWS - 1 && styles.gridRowRule]}>
            {Array.from({ length: 7 }, (_, col) => (
              <View key={col} style={styles.gridCell}>
                <SkeletonItem animatedStyle={animatedStyle} style={styles.dayBlock} />
                <SkeletonItem animatedStyle={animatedStyle} style={styles.dotBlock} />
              </View>
            ))}
          </View>
        ))}
      </View>

      {/* ── Selected-day panel ── */}
      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <SkeletonItem animatedStyle={animatedStyle} style={styles.panelTitle} />
          <SkeletonItem animatedStyle={animatedStyle} style={styles.panelCount} />
        </View>

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
    </View>
  );
};

export default React.memo(SkeletonReleaseCalendar);

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 18,
    marginVertical: 10,
  },
  headingBlock: { width: 170, height: 26, borderRadius: 8, marginBottom: 14 },
  card: {
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  navButton: { width: 34, height: 34, borderRadius: 17 },
  monthBlock: { width: 150, height: 18, borderRadius: 6 },
  weekdayRow: {
    flexDirection: "row",
    paddingVertical: 7,
    marginBottom: 2,
  },
  weekdayCell: { flex: 1, height: 11, borderRadius: 4, marginHorizontal: 3 },
  gridRow: {
    flexDirection: "row",
    height: ROW_HEIGHT,
    alignItems: "center",
  },
  gridRowRule: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  gridCell: { flex: 1, alignItems: "center" },
  dayBlock: { width: 34, height: 34, borderRadius: 17 },
  dotBlock: { width: 5, height: 5, borderRadius: 2.5, marginTop: 3 },
  panel: {
    marginTop: 14,
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 10,
  },
  panelTitle: { width: 170, height: 15, borderRadius: 5 },
  panelCount: { width: 46, height: 22, borderRadius: 11 },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  coverBlock: { width: 46, height: 46, borderRadius: 10 },
  listTextGroup: { flex: 1, marginLeft: 10, gap: 6 },
  titleBlock: { width: "70%", height: 14, borderRadius: 4 },
  metaBlock: { width: "40%", height: 11, borderRadius: 4 },
});
