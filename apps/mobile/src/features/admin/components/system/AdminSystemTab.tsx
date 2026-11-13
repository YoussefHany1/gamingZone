import React, { memo } from "react";
import { Platform, RefreshControl, ScrollView, View } from "react-native";
import * as Updates from "expo-updates";
import { useTranslation } from "react-i18next";
import appConfig from "@/app.json";
import CustomText from "@/src/components/CustomText";
import PressScale from "@/src/components/PressScale";
import { SERVER_URL } from "@/src/constants/config";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import AdminAdsToggle from "@/src/features/settings/components/AdminAdsToggle";
import AdminAuditList from "../AdminAuditList";
import AdminSection from "../AdminSection";
import type { AdminAuditEntry } from "../../types";

export type AdminSystemTabProps = {
  audit: AdminAuditEntry[];
  auditLoading: boolean;
  onRefresh: () => Promise<void>;
  bottomInset: number;
};

const AdminSystemTab = memo(
  ({
    audit,
    auditLoading,
    onRefresh,
    bottomInset,
  }: AdminSystemTabProps): React.ReactElement => {
    const { t } = useTranslation();
    const colors = useThemeColors();

    const styles = useThemeStyles((c) => ({
      content: { padding: 16, paddingBottom: 24 },
      row: {
        flexDirection: "row" as const,
        justifyContent: "space-between" as const,
        gap: 12,
        paddingVertical: 7,
        borderBottomWidth: 1,
        borderBottomColor: c.border,
      },
      label: { color: c.textMuted, fontSize: 13 },
      value: {
        color: c.text,
        fontSize: 13,
        fontWeight: "600" as const,
        flexShrink: 1,
        textAlign: "right" as const,
      },
      mono: {
        color: c.text,
        fontSize: 11,
        flexShrink: 1,
        textAlign: "right" as const,
      },
      refreshRow: { alignSelf: "flex-start" as const, paddingVertical: 8, marginTop: 4 },
      refreshText: { color: c.accentText, fontSize: 12, fontWeight: "700" as const },
      adsRow: { marginTop: 4 },
    }));

    const notDefined = t("admin.system.notDefined");
    const rows: Array<{ label: string; value: string; mono?: boolean }> = [
      {
        label: t("admin.system.channel"),
        value: Updates.channel ?? notDefined,
      },
      {
        label: t("admin.system.runtimeVersion"),
        value: Updates.runtimeVersion ?? notDefined,
      },
      {
        label: t("admin.system.updateId"),
        value: Updates.updateId ?? t("admin.system.runningNativeBuild"),
        mono: true,
      },
      {
        label: t("admin.system.appVersion"),
        value: appConfig.expo.version,
      },
      {
        label: t("admin.system.platform"),
        value: `${Platform.OS} ${Platform.Version}`,
      },
      {
        label: t("admin.system.environment"),
        value: __DEV__ ? "development" : "production",
      },
      {
        label: t("admin.system.apiUrl"),
        value: SERVER_URL,
        mono: true,
      },
    ];

    return (
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]}
        refreshControl={
          <RefreshControl
            refreshing={auditLoading}
            onRefresh={() => void onRefresh()}
            tintColor={colors.accentText}
            colors={[colors.accentText]}
          />
        }
      >
        <AdminSection title={t("admin.system.build")}>
          {rows.map((row, index) => (
            <View
              key={row.label}
              style={[
                styles.row,
                index === rows.length - 1 ? { borderBottomWidth: 0 } : null,
              ]}
            >
              <CustomText style={styles.label}>{row.label}</CustomText>
              <CustomText style={row.mono ? styles.mono : styles.value}>
                {row.value}
              </CustomText>
            </View>
          ))}
        </AdminSection>

        <AdminSection title={t("admin.system.ads")}>
          <View style={styles.adsRow}>
            <AdminAdsToggle />
          </View>
        </AdminSection>

        <AdminSection title={t("admin.system.audit")}>
          <AdminAuditList
            entries={audit}
            emptyLabel={t("admin.system.auditEmpty")}
          />
          <PressScale
            onPress={() => void onRefresh()}
            style={styles.refreshRow}
            accessibilityRole="button"
          >
            <CustomText style={styles.refreshText}>
              {t("admin.system.refresh")}
            </CustomText>
          </PressScale>
        </AdminSection>
      </ScrollView>
    );
  },
);

AdminSystemTab.displayName = "AdminSystemTab";
export default AdminSystemTab;
