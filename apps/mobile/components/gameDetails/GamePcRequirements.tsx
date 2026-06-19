import React, { memo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import COLORS from "../../constants/colors";
import { sharedStyles } from "./shared";
import GamePcRequirementsSkeleton from "../../skeleton/gameDetails/GamePcRequirementsSkeleton";
import type { PcRequirements } from "./types";

type Tab = "min" | "rec";

interface Props {
  pcRequirements: PcRequirements | null;
  pcReqLoading: boolean;
}

const GamePcRequirements: React.FC<Props> = ({ pcRequirements, pcReqLoading }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>("min");

  // Nothing to render while not loading and no data available
  if (!pcReqLoading && !pcRequirements) return null;

  const activeRows =
    activeTab === "min"
      ? (pcRequirements?.minimum ?? [])
      : (pcRequirements?.recommended ?? []);

  return (
    <View style={styles.wrapper}>
      <Text style={sharedStyles.sectionHeader}>
        {t("games.details.pcRequirements")}
      </Text>

      {pcReqLoading && <GamePcRequirementsSkeleton />}

      {!pcReqLoading && pcRequirements && (
        <>
          {/* Min / Recommended tab switcher */}
          <View style={styles.tabRow}>
            {pcRequirements.minimum.length > 0 && (
              <TouchableOpacity
                style={[styles.tab, activeTab === "min" && styles.tabActive]}
                onPress={() => setActiveTab("min")}
              >
                <Text style={[styles.tabText, activeTab === "min" && styles.tabTextActive]}>
                  {t("games.details.minimum")}
                </Text>
              </TouchableOpacity>
            )}
            {pcRequirements.recommended.length > 0 && (
              <TouchableOpacity
                style={[styles.tab, activeTab === "rec" && styles.tabActive]}
                onPress={() => setActiveTab("rec")}
              >
                <Text style={[styles.tabText, activeTab === "rec" && styles.tabTextActive]}>
                  {t("games.details.recommended")}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Spec rows */}
          <View style={styles.specContainer}>
            {activeRows.map((row, i) => (
              <View
                key={i}
                style={[
                  styles.specRow,
                  { backgroundColor: i % 2 === 0 ? "rgba(81,105,150,0.12)" : "transparent" },
                ]}
              >
                <Text style={styles.specLabel}>{row.label}</Text>
                <Text style={styles.specValue}>{row.value}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
};

export default memo(GamePcRequirements);

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 20,
    marginBottom: 10,
  },
  tabRow: {
    flexDirection: "row",
    marginTop: 12,
    marginBottom: 10,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.secondary,
    alignSelf: "flex-start",
  },
  tab: {
    paddingVertical: 7,
    paddingHorizontal: 20,
  },
  tabActive: {
    backgroundColor: COLORS.secondary,
  },
  tabText: {
    color: "#9f9f9f",
    fontSize: 14,
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#fff",
  },
  specContainer: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(81,105,150,0.4)",
    direction: "ltr",
  },
  specRow: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(81,105,150,0.25)",
  },
  specLabel: {
    color: COLORS.secondary,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  specValue: {
    color: "#cfcfcf",
    fontSize: 14,
    fontWeight: "500",
    flexWrap: "wrap",
  },
});
