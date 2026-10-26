import React, { memo, useState } from "react";
import { View, TouchableOpacity } from "react-native";
import CustomText from "@/src/components/CustomText";
import { useTranslation } from "react-i18next";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useSharedStyles } from "./shared";
import GamePcRequirementsSkeleton from "../../skeleton/gameDetails/GamePcRequirementsSkeleton";
import GameCompatibilityCard from "./GameCompatibilityCard";
import { usePcCompatibility } from "@/src/features/pcSpecs/hooks/usePcCompatibility";
import { usePcSpecsStore } from "@/src/store/usePcSpecsStore";
import type { GamePcRequirementsProps, PcRequirementsTab as Tab } from "../../types";

const GamePcRequirements: React.FC<
  GamePcRequirementsProps & { gameId?: number; firstReleaseDate?: number | null }
> = ({ pcRequirements, pcReqLoading, gameId, firstReleaseDate }) => {
  const sharedStyles = useSharedStyles();
  const colors = useThemeColors();
  const specs = usePcSpecsStore((state) => state.specs);
  const compatibility = usePcCompatibility(
    gameId ?? null,
    firstReleaseDate ?? null,
    pcRequirements,
  );
  const styles = useThemeStyles((c) => ({
    wrapper: {
      marginTop: 20,
      marginBottom: 10,
    },
    tabRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginTop: 12,
      marginBottom: 10,
      borderRadius: 10,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: c.accentText,
    },
    tab: {
      paddingVertical: 7,
      width: "50%",
      paddingHorizontal: 16,
      borderRadius: 10,
    },
    tabActive: {
      backgroundColor: c.accent,
    },
    tabText: {
      color: c.textMuted,
      fontSize: 14,
      fontWeight: "600",
      textAlign: "center",
    },
    tabTextActive: {
      color: c.text,
    },
    specContainer: {
      borderRadius: 12,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: c.border,
      direction: "ltr",
    },
    specRow: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderBottomWidth: 0.5,
      borderBottomColor: c.border,
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
      color: c.text,
      fontSize: 14,
      fontWeight: "500",
      flexWrap: "wrap",
    },
  }));

  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>("min");

  // Nothing to render while not loading and no data available
  if (!pcReqLoading && !pcRequirements) return null;

  // Determine available tabs
  const hasMin = (pcRequirements?.minimum?.length ?? 0) > 0;
  const hasRec = (pcRequirements?.recommended?.length ?? 0) > 0;
  const hasRtMin = ((pcRequirements as any)?.rtMinimum?.length ?? 0) > 0;
  const hasRtUltra = ((pcRequirements as any)?.rtUltra?.length ?? 0) > 0;

  // Adjust active tab if current is not available
  let currentTab = activeTab;
  if (currentTab === "min" && !hasMin) {
    if (hasRec) currentTab = "rec";
    else if (hasRtMin) currentTab = "rtmin";
    else if (hasRtUltra) currentTab = "rtultra";
  } else if (currentTab === "rec" && !hasRec) {
    if (hasMin) currentTab = "min";
    else if (hasRtMin) currentTab = "rtmin";
    else if (hasRtUltra) currentTab = "rtultra";
  } else if (currentTab === "rtmin" && !hasRtMin) {
    if (hasMin) currentTab = "min";
    else if (hasRec) currentTab = "rec";
    else if (hasRtUltra) currentTab = "rtultra";
  } else if (currentTab === "rtultra" && !hasRtUltra) {
    if (hasMin) currentTab = "min";
    else if (hasRec) currentTab = "rec";
    else if (hasRtMin) currentTab = "rtmin";
  }

  const activeRows =
    currentTab === "min"
      ? (pcRequirements?.minimum ?? [])
      : currentTab === "rec"
        ? (pcRequirements?.recommended ?? [])
        : currentTab === "rtmin"
          ? ((pcRequirements as any)?.rtMinimum ?? [])
          : ((pcRequirements as any)?.rtUltra ?? []);

  return (
    <View style={styles.wrapper}>
      <CustomText style={sharedStyles.sectionHeader}>
        {t("games.details.pcRequirements")}
      </CustomText>

      {pcReqLoading && <GamePcRequirementsSkeleton />}

      {!pcReqLoading && pcRequirements && (
        <>
          {/* Min / Recommended / RT tabs */}
          <View style={styles.tabRow}>
            {hasMin && (
              <TouchableOpacity
                style={[styles.tab, currentTab === "min" && styles.tabActive]}
                onPress={() => setActiveTab("min")}
              >
                <CustomText
                  style={[styles.tabText, currentTab === "min" && styles.tabTextActive]}
                >
                  {t("games.details.minimum")}
                </CustomText>
              </TouchableOpacity>
            )}
            {hasRec && (
              <TouchableOpacity
                style={[styles.tab, currentTab === "rec" && styles.tabActive]}
                onPress={() => setActiveTab("rec")}
              >
                <CustomText
                  style={[styles.tabText, currentTab === "rec" && styles.tabTextActive]}
                >
                  {t("games.details.recommended")}
                </CustomText>
              </TouchableOpacity>
            )}
            {hasRtMin && (
              <TouchableOpacity
                style={[styles.tab, currentTab === "rtmin" && styles.tabActive]}
                onPress={() => setActiveTab("rtmin")}
              >
                <CustomText
                  style={[styles.tabText, currentTab === "rtmin" && styles.tabTextActive]}
                >
                  {t("games.details.rtMinimum", { defaultValue: "RT Minimum" })}
                </CustomText>
              </TouchableOpacity>
            )}
            {hasRtUltra && (
              <TouchableOpacity
                style={[styles.tab, currentTab === "rtultra" && styles.tabActive]}
                onPress={() => setActiveTab("rtultra")}
              >
                <CustomText
                  style={[
                    styles.tabText,
                    currentTab === "rtultra" && styles.tabTextActive,
                  ]}
                >
                  {t("games.details.rtUltra", { defaultValue: "RT Ultra" })}
                </CustomText>
              </TouchableOpacity>
            )}
          </View>

          {/* Spec rows */}
          <View style={styles.specContainer}>
            {activeRows.map((row: any, i: number) => (
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
          <GameCompatibilityCard compatibility={compatibility} hasSpecs={!!specs} />
        </>
      )}
    </View>
  );
};

export default memo(GamePcRequirements);
