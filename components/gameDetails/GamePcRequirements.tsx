import React, { memo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import COLORS from "../../constants/colors";
import type { PcRequirements } from "./types";

interface Props {
  pcRequirements: PcRequirements | null;
  pcReqLoading: boolean;
}

const GamePcRequirements: React.FC<Props> = ({ pcRequirements, pcReqLoading }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"min" | "rec">("min");

  if (!pcReqLoading && !pcRequirements) return null;

  return (
    <View style={styles.sysReqWrapper}>
      <View style={styles.sysReqTitleRow}>
        <Text style={styles.detailsHeader}>
          {t("games.details.pcRequirements") ?? "PC System Requirements"}
        </Text>
      </View>

      {pcReqLoading && (
        <Text style={styles.sysReqLoading}>Loading…</Text>
      )}

      {!pcReqLoading && pcRequirements && (
        <>
          <View style={styles.sysReqTabRow}>
            {pcRequirements.minimum.length > 0 && (
              <TouchableOpacity
                style={[styles.sysReqTab, activeTab === "min" && styles.sysReqTabActive]}
                onPress={() => setActiveTab("min")}
              >
                <Text style={[styles.sysReqTabText, activeTab === "min" && styles.sysReqTabTextActive]}>
                  {t("games.details.minimum") ?? "Minimum"}
                </Text>
              </TouchableOpacity>
            )}
            {pcRequirements.recommended.length > 0 && (
              <TouchableOpacity
                style={[styles.sysReqTab, activeTab === "rec" && styles.sysReqTabActive]}
                onPress={() => setActiveTab("rec")}
              >
                <Text style={[styles.sysReqTabText, activeTab === "rec" && styles.sysReqTabTextActive]}>
                  {t("games.details.recommended") ?? "Recommended"}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.sysReqContainer}>
            {(activeTab === "min" ? pcRequirements.minimum : pcRequirements.recommended).map((row, i) => (
              <View
                key={i}
                style={[
                  styles.sysReqRow,
                  { backgroundColor: i % 2 === 0 ? "rgba(81,105,150,0.12)" : "transparent" },
                ]}
              >
                <Text style={styles.sysReqLabel}>{row.label}</Text>
                <Text style={styles.sysReqValue}>{row.value}</Text>
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
  sysReqWrapper: {
    marginTop: 20,
    marginBottom: 10,
  },
  sysReqTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  detailsHeader: {
    color: COLORS.textLight,
    fontSize: 24,
    fontWeight: "600",
    textDecorationLine: "underline",
    marginTop: 10,
  },
  sysReqLoading: {
    color: "#9f9f9f",
    fontSize: 15,
    textAlign: "center",
    marginVertical: 12,
  },
  sysReqTabRow: {
    flexDirection: "row",
    marginBottom: 10,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.secondary,
    alignSelf: "flex-start",
  },
  sysReqTab: {
    paddingVertical: 7,
    paddingHorizontal: 20,
  },
  sysReqTabActive: {
    backgroundColor: COLORS.secondary,
  },
  sysReqTabText: {
    color: "#9f9f9f",
    fontSize: 14,
    fontWeight: "600",
  },
  sysReqTabTextActive: {
    color: "#fff",
  },
  sysReqContainer: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(81,105,150,0.4)",
  },
  sysReqRow: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(81,105,150,0.25)",
  },
  sysReqLabel: {
    color: COLORS.secondary,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  sysReqValue: {
    color: "#cfcfcf",
    fontSize: 14,
    fontWeight: "500",
    flexWrap: "wrap",
  },
});
