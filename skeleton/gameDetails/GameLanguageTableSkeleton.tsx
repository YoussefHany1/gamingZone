import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import COLORS from "../../constants/colors";
import useShimmer from "./useShimmer";
import SkeletonBar from "./SkeletonBar";

// Static title + static column headers + shimmer rows
const GameLanguageTableSkeleton: React.FC = () => {
  const { t } = useTranslation();
  const shimmer = useShimmer();
  const S = (p: Parameters<typeof SkeletonBar>[0]) => <SkeletonBar shimmer={shimmer} {...p} />;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{t("games.details.languages.title")}</Text>

      {/* Column headers — fully static */}
      <View style={styles.tableHeader}>
        <View style={styles.langHeaderCell}>
          <Ionicons name="language" size={18} color={COLORS.secondary} />
          <Text style={styles.headerLabel}>{t("games.details.languages.Language")}</Text>
        </View>
        {(["mic", "document-text", "desktop"] as const).map((icon, i) => (
          <View key={icon} style={styles.iconHeaderCell}>
            <Ionicons name={icon} size={18} color={COLORS.secondary} />
            <Text style={styles.headerLabel}>
              {[
                t("games.details.languages.audio"),
                t("games.details.languages.subtitles"),
                t("games.details.languages.interface"),
              ][i]}
            </Text>
          </View>
        ))}
      </View>

      {/* Shimmer rows */}
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <View
          key={i}
          style={[
            styles.tableRow,
            { backgroundColor: i % 2 !== 0 ? "rgba(81,105,150,0.1)" : "transparent" },
          ]}
        >
          <View style={{ flex: 2, paddingLeft: 8 }}>
            <S w="75%" h={14} r={5} />
          </View>
          {[1, 2, 3].map((j) => (
            <View key={j} style={styles.checkCell}>
              <S w={20} h={20} r={10} />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
};

export default GameLanguageTableSkeleton;

const styles = StyleSheet.create({
  container: { width: "100%", marginTop: 20 },
  header: {
    color: COLORS.textLight,
    fontSize: 24,
    fontWeight: "600",
    textDecorationLine: "underline",
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.secondary,
    paddingVertical: 10,
    marginTop: 10,
    alignItems: "flex-end",
  },
  langHeaderCell: { flex: 2, marginLeft: 8 },
  iconHeaderCell: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerLabel: { color: "#9f9f9f", marginTop: 2 },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(81,105,150,0.3)",
  },
  checkCell: { flex: 1, alignItems: "center", justifyContent: "center" },
});
