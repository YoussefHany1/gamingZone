import React, { memo } from "react";
import { View, StyleSheet } from "react-native";
import * as Updates from "expo-updates";
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
  return (
    <View style={styles.panel}>
      <CustomText style={styles.heading}>Admin Dashboard</CustomText>
      <CustomText style={styles.heading}>
        Channel: {Updates.channel ?? "Not Defined"}
      </CustomText>
      <CustomText style={styles.heading}>
        Runtime Version: {Updates.runtimeVersion ?? "Not Defined"}
      </CustomText>
      <CustomText>Update ID: {Updates.updateId ?? "Running Native Build"}</CustomText>
      <CustomText>App Config Version: {appConfig.expo.version}</CustomText>
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
