import React, { memo, useState } from "react";
import { View, TouchableOpacity } from "react-native";
import CustomText from "@/src/components/CustomText";
import { useTranslation } from "react-i18next";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useSharedStyles } from "./shared";
import GamePcRequirementsSkeleton from "../../skeleton/gameDetails/GamePcRequirementsSkeleton";
import type { GamePcRequirementsProps, PcRequirementsTab as Tab } from "../../types";

const GamePcRequirements: React.FC<GamePcRequirementsProps> = ({
  pcRequirements,
  pcReqLoading,
}) => {
  const sharedStyles = useSharedStyles();
  const colors = useThemeColors();
  const styles = useThemeStyles((c) => ({
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
      borderColor: c.accentText,
      alignSelf: "flex-start",
    },
    tab: {
      paddingVertical: 7,
      paddingHorizontal: 20,
    },
    tabActive: {
      backgroundColor: c.accent,
    },
    tabText: {
      color: "#9f9f9f",
      fontSize: 14,
      fontWeight: "600",
    },
    tabTextActive: {
      color: c.text,
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
      color: c.accentText,
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
  }));

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
      <CustomText style={sharedStyles.sectionHeader}>
        {t("games.details.pcRequirements")}
      </CustomText>

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
                <CustomText
                  style={[styles.tabText, activeTab === "min" && styles.tabTextActive]}
                >
                  {t("games.details.minimum")}
                </CustomText>
              </TouchableOpacity>
            )}
            {pcRequirements.recommended.length > 0 && (
              <TouchableOpacity
                style={[styles.tab, activeTab === "rec" && styles.tabActive]}
                onPress={() => setActiveTab("rec")}
              >
                <CustomText
                  style={[styles.tabText, activeTab === "rec" && styles.tabTextActive]}
                >
                  {t("games.details.recommended")}
                </CustomText>
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
                  {
                    backgroundColor: i % 2 === 0 ? colors.stripe : "transparent",
                  },
                ]}
              >
                <CustomText style={styles.specLabel}>{row.label}</CustomText>
                <CustomText style={styles.specValue}>{row.value}</CustomText>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
};

export default memo(GamePcRequirements);
