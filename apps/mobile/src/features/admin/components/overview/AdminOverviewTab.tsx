import React, { memo, useCallback } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import {
  Radio,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import ErrorState from "@/src/components/ErrorState";
import LoadingState from "@/src/components/LoadingState";
import PressScale from "@/src/components/PressScale";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import AdminBreakdownList from "../AdminBreakdownList";
import AdminKpiCard from "../AdminKpiCard";
import AdminSection from "../AdminSection";
import AdminSignupsChart from "../AdminSignupsChart";
import AdminUserRow from "../AdminUserRow";
import { formatAdminDateTime } from "../../lib/format";
import type { AdminApiError } from "../../lib/adminApi";
import type { AdminOverview, AdminRange } from "../../types";

const RANGES: AdminRange[] = ["7d", "30d", "90d"];

export type AdminOverviewTabProps = {
  range: AdminRange;
  onChangeRange: (range: AdminRange) => void;
  data: AdminOverview | null;
  loading: boolean;
  refreshing: boolean;
  error: AdminApiError | null;
  onRefresh: () => void;
  onOpenUser: (uid: string) => void;
  onOpenUsersTab: () => void;
  bottomInset: number;
};

const AdminOverviewTab = memo(
  ({
    range,
    onChangeRange,
    data,
    loading,
    refreshing,
    error,
    onRefresh,
    onOpenUser,
    onOpenUsersTab,
    bottomInset,
  }: AdminOverviewTabProps): React.ReactElement => {
    const { t, i18n } = useTranslation();
    const colors = useThemeColors();

    const styles = useThemeStyles((c) => ({
      container: { flex: 1 },
      content: { padding: 16, paddingBottom: 24 },
      rangeRow: {
        flexDirection: "row" as const,
        gap: 8,
        marginBottom: 14,
      },
      chip: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: c.border,
        backgroundColor: c.surface,
      },
      chipActive: {
        backgroundColor: c.accent,
        borderColor: c.accent,
      },
      chipText: { color: c.textMuted, fontSize: 12, fontWeight: "600" as const },
      chipTextActive: { color: c.onAccent },
      kpiGrid: {
        flexDirection: "row" as const,
        flexWrap: "wrap" as const,
        justifyContent: "space-between" as const,
      },
      note: { color: c.textSubtle, fontSize: 11, marginTop: 4 },
      totalsRow: {
        flexDirection: "row" as const,
        justifyContent: "space-between" as const,
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: c.border,
        gap: 8,
      },
      totalsLabel: { color: c.textMuted, fontSize: 13 },
      totalsValue: { color: c.text, fontSize: 13, fontWeight: "700" as const },
      linkRow: {
        marginTop: 10,
        alignSelf: "flex-start" as const,
        paddingVertical: 6,
      },
      linkText: { color: c.accentText, fontSize: 13, fontWeight: "700" as const },
    }));

    const handleChip = useCallback(
      (next: AdminRange) => () => onChangeRange(next),
      [onChangeRange],
    );

    if (loading && !data) {
      return <LoadingState label={t("admin.access.checking")} />;
    }

    if (error && !data) {
      return (
        <ErrorState
          message={t("admin.errors.generic")}
          subMessage={error.message}
          showContactButton={false}
          onRetry={onRefresh}
          retrying={refreshing}
        />
      );
    }

    if (!data) {
      return <LoadingState />;
    }

    const { totals, signups, distributions, recentUsers } = data;
    const platformLabel = (value: string) => {
      if (value === "unknown") return t("admin.overview.countries.unknown");
      const key = `settings.profile.platforms.${value.toLowerCase()}`;
      const translated = t(key);
      return translated === key ? value : translated;
    };
    const countryLabel = (value: string) =>
      value === "unknown" ? t("admin.overview.countries.unknown") : value;

    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accentText}
            colors={[colors.accentText]}
          />
        }
      >
        <View style={styles.rangeRow}>
          {RANGES.map((key) => (
            <PressScale
              key={key}
              onPress={handleChip(key)}
              style={[styles.chip, range === key ? styles.chipActive : null]}
              accessibilityRole="button"
            >
              <CustomText
                style={[styles.chipText, range === key ? styles.chipTextActive : null]}
              >
                {t(`admin.overview.range.${key}`)}
              </CustomText>
            </PressScale>
          ))}
        </View>

        <View style={styles.kpiGrid}>
          <AdminKpiCard
            icon={Users}
            label={t("admin.overview.totals.users")}
            value={totals.users.toLocaleString(i18n.language)}
          />
          <AdminKpiCard
            icon={UserPlus}
            label={t("admin.overview.signups.title")}
            value={signups.inRange.toLocaleString(i18n.language)}
            hint={t(`admin.overview.range.${range}`)}
          />
          <AdminKpiCard
            icon={Radio}
            label={t("admin.overview.totals.onlineNow")}
            value={totals.onlineNow.toLocaleString(i18n.language)}
          />
          <AdminKpiCard
            icon={ShieldCheck}
            label={t("admin.overview.totals.admins")}
            value={totals.admins.toLocaleString(i18n.language)}
          />
        </View>

        <AdminSection
          title={t("admin.overview.signups.title")}
          subtitle={t("admin.overview.generatedAt", {
            time: formatAdminDateTime(data.generatedAt, i18n.language),
          })}
        >
          <AdminSignupsChart series={signups.series} />
          {signups.approximate ? (
            <CustomText style={styles.note}>
              {t("admin.overview.approximate", { count: data.sampleSize })}
            </CustomText>
          ) : null}
        </AdminSection>

        <AdminSection title={t("admin.overview.community.title")}>
          <View style={styles.totalsRow}>
            <CustomText style={styles.totalsLabel}>
              {t("admin.overview.totals.profiles")}
            </CustomText>
            <CustomText style={styles.totalsValue}>{totals.profiles}</CustomText>
          </View>
          <View style={styles.totalsRow}>
            <CustomText style={styles.totalsLabel}>
              {t("admin.overview.totals.conversations")}
            </CustomText>
            <CustomText style={styles.totalsValue}>{totals.conversations}</CustomText>
          </View>
          <View style={styles.totalsRow}>
            <CustomText style={styles.totalsLabel}>
              {t("admin.overview.totals.messages")}
            </CustomText>
            <CustomText style={styles.totalsValue}>{totals.messages}</CustomText>
          </View>
          <View style={styles.totalsRow}>
            <CustomText style={styles.totalsLabel}>
              {t("admin.overview.totals.playSessions")}
            </CustomText>
            <CustomText style={styles.totalsValue}>{totals.playSessions}</CustomText>
          </View>
          <View style={styles.totalsRow}>
            <CustomText style={styles.totalsLabel}>
              {t("admin.overview.totals.friendships")}
            </CustomText>
            <CustomText style={styles.totalsValue}>{totals.friendships}</CustomText>
          </View>
          <View style={styles.totalsRow}>
            <CustomText style={styles.totalsLabel}>
              {t("admin.overview.totals.blockedPairs")}
            </CustomText>
            <CustomText style={styles.totalsValue}>{totals.blockedPairs}</CustomText>
          </View>
          <View style={[styles.totalsRow, { borderBottomWidth: 0 }]}>
            <CustomText style={styles.totalsLabel}>
              {t("admin.overview.totals.linkedAccounts")}
            </CustomText>
            <CustomText style={styles.totalsValue}>{totals.linkedAccounts}</CustomText>
          </View>
        </AdminSection>

        <AdminSection
          title={t("admin.overview.platforms.title")}
          subtitle={t("admin.overview.platforms.scope")}
        >
          <AdminBreakdownList
            rows={distributions.platforms}
            emptyLabel={t("admin.overview.countries.empty")}
            formatValue={platformLabel}
          />
        </AdminSection>

        <AdminSection
          title={t("admin.overview.countries.title")}
          subtitle={t("admin.overview.platforms.scope")}
        >
          <AdminBreakdownList
            rows={distributions.countries}
            emptyLabel={t("admin.overview.countries.empty")}
            formatValue={countryLabel}
          />
        </AdminSection>

        <AdminSection title={t("admin.overview.recentUsers.title")}>
          {recentUsers.length === 0 ? (
            <CustomText style={styles.note}>
              {t("admin.overview.recentUsers.empty")}
            </CustomText>
          ) : (
            recentUsers.map((user) => (
              <AdminUserRow
                key={user.uid}
                user={user}
                onPress={() => onOpenUser(user.uid)}
              />
            ))
          )}
          <PressScale onPress={onOpenUsersTab} style={styles.linkRow}>
            <CustomText style={styles.linkText}>
              {t("admin.overview.recentUsers.viewAll")}
            </CustomText>
          </PressScale>
        </AdminSection>

        <View style={{ height: 1 }} />
      </ScrollView>
    );
  },
);

AdminOverviewTab.displayName = "AdminOverviewTab";
export default AdminOverviewTab;
