import React, { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle, Text as SvgText, Path } from "react-native-svg";
import { useTranslation } from "react-i18next";
import COLORS from "../../constants/colors";
import { sharedStyles } from "./shared";

interface Props {
  main: number | null;
  mainExtra: number | null;
  completionist: number | null;
}

// SVG text styling kept at module level to avoid per-render allocation
const SVG_FONT_SIZE = 34;
const SVG_FONT_WEIGHT = "bold";
const SVG_FILL = "#fff";
// Vertical nudge so the text sits visually centred inside the circle
const SVG_DY = 38 * 0.1;

interface HoursCircleProps {
  hours: number;
  /** SVG path `d` attribute; omit to render a full circle. */
  pathD?: string;
}

/** Renders a number of hours inside a decorative SVG arc or circle. */
const HoursCircle: React.FC<HoursCircleProps> = ({ hours, pathD }) => (
  <Svg width={85} height={85} viewBox="0 0 85 85">
    {pathD ? (
      <Path
        d={pathD}
        stroke={COLORS.secondary}
        strokeWidth={5}
        fill="none"
        strokeLinecap="round"
      />
    ) : (
      <Circle cx={42} cy={42} r={38} stroke={COLORS.secondary} strokeWidth={5} fill="none" />
    )}
    <SvgText
      x={42}
      y={42}
      textAnchor="middle"
      alignmentBaseline="middle"
      fontSize={SVG_FONT_SIZE}
      dy={SVG_DY}
      fontWeight={SVG_FONT_WEIGHT}
      fill={SVG_FILL}
    >
      {hours}
    </SvgText>
  </Svg>
);

const GameHowLongToBeat: React.FC<Props> = ({ main, mainExtra, completionist }) => {
  const { t } = useTranslation();

  // BUG FIX: original used `!main` which treats 0 hours as falsy.
  // Use explicit null check so games that take 0 hours still render.
  if (main == null && mainExtra == null && completionist == null) return null;

  return (
    <>
      <View style={styles.titleRow}>
        <Text style={sharedStyles.sectionHeader}>
          {t("games.details.howLongToBeat.title")}
        </Text>
      </View>

      <View style={styles.cardsContainer}>
        {main != null && (
          <View style={styles.card}>
            <Text style={styles.cardHeader}>
              {t("games.details.howLongToBeat.main")}
            </Text>
            {/* Quarter-arc: top-right quadrant only */}
            <HoursCircle hours={main} pathD="M 42 4 A 38 38 0 0 1 80 42" />
            <Text style={styles.hoursLabel}>{t("games.details.howLongToBeat.hours")}</Text>
          </View>
        )}

        {mainExtra != null && (
          <View style={styles.card}>
            <Text style={styles.cardHeader}>
              {t("games.details.howLongToBeat.mainExtra")}
            </Text>
            {/* Half-arc: right semicircle */}
            <HoursCircle hours={mainExtra} pathD="M 42 4 A 38 38 0 0 1 42 80" />
            <Text style={styles.hoursLabel}>{t("games.details.howLongToBeat.hours")}</Text>
          </View>
        )}

        {completionist != null && (
          <View style={styles.card}>
            <Text style={styles.cardHeader}>
              {t("games.details.howLongToBeat.completionist")}
            </Text>
            {/* Full circle */}
            <HoursCircle hours={completionist} />
            <Text style={styles.hoursLabel}>{t("games.details.howLongToBeat.hours")}</Text>
          </View>
        )}
      </View>
    </>
  );
};

export default memo(GameHowLongToBeat);

const styles = StyleSheet.create({
  titleRow: {
    marginTop: 30,
  },
  cardsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
    width: "100%",
    padding: 10,
  },
  card: {
    marginHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cardHeader: {
    color: COLORS.textLight,
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
    textAlign: "center",
  },
  hoursLabel: {
    color: "#9f9f9f",
  },
});
