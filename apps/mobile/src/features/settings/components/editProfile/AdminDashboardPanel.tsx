import React, { memo } from "react";
import { View, StyleSheet } from "react-native";
import * as Updates from "expo-updates";
import { useTranslation } from "react-i18next";
import appConfig from "@/app.json";
import CustomText from "@/src/components/CustomText";

/**
 * Build/runtime diagnostics, shown only to admin accounts. The colours are
 * deliberately unthemed — this panel is a debug surface, not app chrome — and
 * are named so their purpose is explicit.
 */
const PANEL_BACKGROUND = "gold";
const PANEL_TEXT = "#3a2c00";

const AdminDashboardPanel = memo((): React.ReactElement => {
  const { t } = useTranslation();

  return (
    <View style={styles.panel}>
      <CustomText style={styles.heading}>{t("settings.admin.dashboard")}</CustomText>
      <CustomText style={styles.heading}>
        {t("settings.admin.channel", {
          value: Updates.channel ?? t("settings.admin.notDefined"),
        })}
      </CustomText>
      <CustomText style={styles.heading}>
        {t("settings.admin.runtimeVersion", {
          value: Updates.runtimeVersion ?? t("settings.admin.notDefined"),
        })}
      </CustomText>
      <CustomText>
        {t("settings.admin.updateId", {
          value: Updates.updateId ?? t("settings.admin.runningNativeBuild"),
        })}
      </CustomText>
      <CustomText>
        {t("settings.admin.appConfigVersion", {
          value: appConfig.expo.version,
        })}
      </CustomText>
    </View>
  );
});

const styles = StyleSheet.create({
  panel: {
    backgroundColor: PANEL_BACKGROUND,
    padding: 15,
    margin: 20,
  },
  heading: { color: PANEL_TEXT },
});

AdminDashboardPanel.displayName = "AdminDashboardPanel";
export default AdminDashboardPanel;
