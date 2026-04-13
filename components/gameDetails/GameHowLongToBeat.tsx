import React, { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle, Text as SvgText, Path } from "react-native-svg";
import { useTranslation } from "react-i18next";
import COLORS from "../../constants/colors";

interface Props {
  main: number | null;
  mainExtra: number | null;
  completionist: number | null;
}

const TEXT_STYLE = { color: "#fff", fontSize: 34, fontWeight: "bold" as const };

const GameHowLongToBeat: React.FC<Props> = ({ main, mainExtra, completionist }) => {
  const { t } = useTranslation();

  if (!main && !mainExtra && !completionist) return null;

  return (
    <>
      <View style={{ marginTop: 30 }}>
        <Text style={styles.detailsHeader}>{t("games.details.howLongToBeat.title")}</Text>
      </View>
      <View style={styles.howLongToBeatContainer}>
        {main != null && (
          <View style={styles.howLongToBeat}>
            <Text style={styles.howLongToBeatHeader}>{t("games.details.howLongToBeat.main")}</Text>
            <Svg height="85" width="85">
              <Path d="M 40 4 A 36 36 0 0 1 76 40" stroke={COLORS.secondary} strokeWidth={5} fill="none" strokeLinecap="round" />
              <SvgText x={40} y={40} textAnchor="middle" alignmentBaseline="middle" fontSize={TEXT_STYLE.fontSize} dy={38 * 0.1} fontWeight={String(TEXT_STYLE.fontWeight)} fill={TEXT_STYLE.color}>{main}</SvgText>
            </Svg>
            <Text style={{ color: "#9f9f9f" }}>{t("games.details.howLongToBeat.hours")}</Text>
          </View>
        )}
        {mainExtra != null && (
          <View style={styles.howLongToBeat}>
            <Text style={styles.howLongToBeatHeader}>{t("games.details.howLongToBeat.mainExtra")}</Text>
            <Svg width={80} height={80} viewBox="0 0 80 80">
              <Path d="M 40 4 A 36 36 0 0 1 40 76" stroke={COLORS.secondary} strokeWidth={5} fill="none" strokeLinecap="round" />
              <SvgText x={40} y={40} textAnchor="middle" alignmentBaseline="middle" fontSize={TEXT_STYLE.fontSize} dy={38 * 0.1} fontWeight={String(TEXT_STYLE.fontWeight)} fill={TEXT_STYLE.color}>{mainExtra}</SvgText>
            </Svg>
            <Text style={{ color: "#9f9f9f" }}>{t("games.details.howLongToBeat.hours")}</Text>
          </View>
        )}
        {completionist != null && (
          <View style={styles.howLongToBeat}>
            <Text style={styles.howLongToBeatHeader}>{t("games.details.howLongToBeat.completionist")}</Text>
            <Svg width={80} height={80} viewBox="0 0 80 80">
              <Circle cx={40} cy={40} r={36} stroke={COLORS.secondary} strokeWidth={5} fill="none" />
              <SvgText x={40} y={40} textAnchor="middle" alignmentBaseline="middle" fontSize={TEXT_STYLE.fontSize} dy={38 * 0.1} fontWeight={String(TEXT_STYLE.fontWeight)} fill={TEXT_STYLE.color}>{completionist}</SvgText>
            </Svg>
            <Text style={{ color: "#9f9f9f" }}>{t("games.details.howLongToBeat.hours")}</Text>
          </View>
        )}
      </View>
    </>
  );
};

export default memo(GameHowLongToBeat);

const styles = StyleSheet.create({
  detailsHeader: {
    color: COLORS.textLight,
    fontSize: 24,
    fontWeight: "600",
    textDecorationLine: "underline",
    marginTop: 10,
  },
  howLongToBeatContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
    width: "100%",
    padding: 10,
  },
  howLongToBeat: {
    marginHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  howLongToBeatHeader: {
    color: COLORS.textLight,
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
    textAlign: "center",
  },
});
