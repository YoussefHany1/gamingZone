/**
 * PsnManualPanel — the fallback for users who cannot use the in-app WebView.
 *
 * The NPSSO token is copied from Sony's ssocookie page and pasted here.
 */
import React, { memo, useState } from "react";
import { TouchableOpacity, ActivityIndicator, Linking } from "react-native";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import CustomTextInput from "@/src/components/CustomTextInput";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useLinkPanelStyles } from "@/src/features/linking/components/useLinkPanelStyles";
import { PSN_COOKIE_URL } from "@/src/features/linking/lib/constants";

export type PsnManualPanelProps = {
  busy: boolean;
  onSubmit: (npsso: string) => Promise<void>;
  onBack: () => void;
};

function PsnManualPanel({
  busy,
  onSubmit,
  onBack,
}: PsnManualPanelProps): React.ReactElement {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = useLinkPanelStyles();
  const [npssoInput, setNpssoInput] = useState("");

  const handleSubmit = async (): Promise<void> => {
    if (!npssoInput.trim()) return;
    await onSubmit(npssoInput.trim());
    setNpssoInput("");
  };

  return (
    <>
      <CustomText style={styles.title}>
        {t("settings.profile.linking.psn.manualTitle") || "Connect PlayStation"}
      </CustomText>
      <CustomText style={styles.description}>
        {t("settings.profile.linking.psn.manualInstructions") ||
          "Open the page below, sign in if needed, copy the NPSSO token shown there, and paste it here."}
      </CustomText>
      <TouchableOpacity
        style={[styles.secondaryBtn, styles.mbMedium]}
        onPress={() =>
          Linking.openURL(PSN_COOKIE_URL).catch(() => {
            /* ignore */
          })
        }
      >
        <CustomText style={styles.secondaryBtnText}>
          {t("settings.profile.linking.psn.openCookiePage") || "Open NPSSO page"}
        </CustomText>
      </TouchableOpacity>
      <CustomTextInput
        style={styles.inputWrap}
        placeholder="NPSSO"
        placeholderTextColor={colors.textSubtle}
        value={npssoInput}
        onChangeText={setNpssoInput}
        autoCapitalize="none"
        autoCorrect={false}
        selectTextOnFocus
      />
      <TouchableOpacity style={styles.primaryBtn} onPress={handleSubmit} disabled={busy}>
        {busy ? (
          <ActivityIndicator color={colors.onAccent} />
        ) : (
          <CustomText style={styles.primaryBtnText}>
            {t("settings.profile.linking.psn.connect") || "Connect"}
          </CustomText>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.secondaryBtn, styles.mtSmall]}
        onPress={onBack}
      >
        <CustomText style={styles.secondaryBtnText}>{t("common.back") || "Back"}</CustomText>
      </TouchableOpacity>
    </>
  );
}

PsnManualPanel.displayName = "PsnManualPanel";

export default memo(PsnManualPanel);
