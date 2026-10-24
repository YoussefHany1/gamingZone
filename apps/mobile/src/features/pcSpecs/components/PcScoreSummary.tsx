import React, { useMemo } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import CustomText from "@/src/components/CustomText";
import { estimatePcScore, findCpuById, findGpuById } from "@gaming-zone/utils";
import type { PcSpecs } from "@gaming-zone/core";

type PcScoreSummaryProps = {
  specs: Pick<PcSpecs, "cpuId" | "gpuId"> | null;
};

/**
 * Live capability preview for the specs screen: an overall 0–100 score bar
 * with a tier label and per-part mini scores.
 *
 * When either part is unresolvable the estimate would be meaningless, so the
 * card shows a neutral placeholder instead of a tier badge.
 */
const PcScoreSummary: React.FC<PcScoreSummaryProps> = ({ specs }) => {
  const { t } = useTranslation();

  const summary = useMemo(
    () => (specs ? estimatePcScore({ ...specs, ramGb: 0, freeStorageGb: 0, updatedAt: 0 }) : null),
    [specs],
  );
  const cpu = useMemo(() => findCpuById(specs?.cpuId ?? ""), [specs?.cpuId]);
  const gpu = useMemo(() => findGpuById(specs?.gpuId ?? ""), [specs?.gpuId]);

  const styles = useThemeStyles((c) => ({
    card: {
      backgroundColor: c.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      padding: 16,
      gap: 12,
    },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    title: { color: c.text, fontSize: 16, fontWeight: "700" },
    tier: { color: c.accentText, fontSize: 13, fontWeight: "700" },
    barTrack: {
      height: 10,
      borderRadius: 5,
      backgroundColor: c.background,
      borderWidth: 1,
      borderColor: c.border,
      overflow: "hidden",
    },
    barFill: {
      height: "100%",
      borderRadius: 5,
      backgroundColor: c.accent,
      width: `${summary?.score ?? 0}%` as `${number}%`,
    },
    scoreRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    scoreLabel: { color: c.textMuted, fontSize: 13 },
    scoreValue: { color: c.text, fontSize: 13, fontWeight: "600" },
    incomplete: { color: c.textMuted, fontSize: 13, textAlign: "center", paddingVertical: 4 },
  }));

  return (
    <View style={styles.card}>
      {summary ? (
        <>
          <View style={styles.header}>
            <CustomText style={styles.title}>{t("pcSpecs.summary.title")}</CustomText>
            <CustomText style={styles.tier}>
              {t(`pcSpecs.summary.tier.${summary.tier}`)}
            </CustomText>
          </View>
          <View style={styles.barTrack}>
            <View style={styles.barFill} />
          </View>
          <View style={styles.scoreRow}>
            <CustomText style={styles.scoreLabel}>{t("pcSpecs.summary.score")}</CustomText>
            <CustomText style={styles.scoreValue}>{summary.score} / 100</CustomText>
          </View>
          {cpu && (
            <View style={styles.scoreRow}>
              <CustomText style={styles.scoreLabel}>{t("pcSpecs.summary.cpu")}</CustomText>
              <CustomText style={styles.scoreValue}>{cpu.score} / 100</CustomText>
            </View>
          )}
          {gpu && (
            <View style={styles.scoreRow}>
              <CustomText style={styles.scoreLabel}>{t("pcSpecs.summary.gpu")}</CustomText>
              <CustomText style={styles.scoreValue}>{gpu.score} / 100</CustomText>
            </View>
          )}
        </>
      ) : (
        <CustomText style={styles.incomplete}>{t("pcSpecs.summary.incomplete")}</CustomText>
      )}
    </View>
  );
};

export default React.memo(PcScoreSummary);
