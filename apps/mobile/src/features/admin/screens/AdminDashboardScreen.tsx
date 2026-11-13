import React, { memo, useCallback, useState } from "react";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ShieldOff } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import ErrorState from "@/src/components/ErrorState";
import LoadingState from "@/src/components/LoadingState";
import PressScale from "@/src/components/PressScale";
import { useAdminAccess } from "@/src/hooks/useIsAdmin";
import { useBottomInset } from "@/src/hooks/useBottomInset";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import type { SettingsStackParamList } from "@/src/navigation/AppNavigator";
import AdminOverviewTab from "../components/overview/AdminOverviewTab";
import AdminSystemTab from "../components/system/AdminSystemTab";
import AdminUsersTab from "../components/users/AdminUsersTab";
import { useAdminAudit } from "../hooks/useAdminAudit";
import { useAdminOverview } from "../hooks/useAdminOverview";
import { useAdminUsers } from "../hooks/useAdminUsers";
import type { AdminRange } from "../types";

type DashboardTab = "overview" | "users" | "system";

const TABS: DashboardTab[] = ["overview", "users", "system"];

const OverviewTabContainer = memo(
  ({
    range,
    onChangeRange,
    onOpenUser,
    onOpenUsersTab,
    bottomInset,
  }: {
    range: AdminRange;
    onChangeRange: (range: AdminRange) => void;
    onOpenUser: (uid: string) => void;
    onOpenUsersTab: () => void;
    bottomInset: number;
  }) => {
    const overview = useAdminOverview(range);
    return (
      <AdminOverviewTab
        range={range}
        onChangeRange={onChangeRange}
        data={overview.data}
        loading={overview.loading}
        refreshing={overview.refreshing}
        error={overview.error}
        onRefresh={() => void overview.refresh()}
        onOpenUser={onOpenUser}
        onOpenUsersTab={onOpenUsersTab}
        bottomInset={bottomInset}
      />
    );
  },
);
OverviewTabContainer.displayName = "OverviewTabContainer";

const UsersTabContainer = memo(
  ({
    onOpenUser,
    bottomInset,
  }: {
    onOpenUser: (uid: string) => void;
    bottomInset: number;
  }) => {
    const users = useAdminUsers();
    return (
      <AdminUsersTab
        query={users.query}
        setQuery={users.setQuery}
        filter={users.filter}
        setFilter={users.setFilter}
        rows={users.rows}
        mode={users.mode}
        loading={users.loading}
        loadingMore={users.loadingMore}
        error={users.error}
        refresh={users.refresh}
        loadMore={users.loadMore}
        hasMore={users.hasMore}
        onOpenUser={onOpenUser}
        bottomInset={bottomInset}
      />
    );
  },
);
UsersTabContainer.displayName = "UsersTabContainer";

const SystemTabContainer = memo(({ bottomInset }: { bottomInset: number }) => {
  const audit = useAdminAudit();
  return (
    <AdminSystemTab
      audit={audit.entries}
      auditLoading={audit.loading}
      onRefresh={audit.refresh}
      bottomInset={bottomInset}
    />
  );
});
SystemTabContainer.displayName = "SystemTabContainer";

function AdminDashboardScreen(): React.ReactElement {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const colors = useThemeColors();
  const bottomInset = useBottomInset();

  const { isAdmin, isLoading, error, refresh } = useAdminAccess();
  const [tab, setTab] = useState<DashboardTab>("overview");
  const [range, setRange] = useState<AdminRange>("30d");

  // Claims ride on the cached ID token: re-read (forcing a refresh) when the
  // dashboard opens so a just-promoted/demoted admin sees the current state.
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const handleOpenUser = useCallback(
    (uid: string) => navigation.navigate("AdminUserDetail", { uid }),
    [navigation],
  );

  const styles = useThemeStyles((c) => ({
    container: { flex: 1, backgroundColor: c.background },
    tabs: {
      flexDirection: "row" as const,
      gap: 6,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
    },
    tab: {
      flex: 1,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      paddingVertical: 9,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    tabActive: { backgroundColor: c.accent, borderColor: c.accent },
    tabText: { color: c.textMuted, fontSize: 13, fontWeight: "700" as const },
    tabTextActive: { color: c.onAccent },
    body: { flex: 1 },
  }));

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["left", "right"]}>
        <LoadingState label={t("admin.access.checking")} />
      </SafeAreaView>
    );
  }

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.container} edges={["left", "right"]}>
        <ErrorState
          icon={ShieldOff}
          iconColor={colors.danger}
          message={t("admin.access.denied")}
          subMessage={
            error ? t("admin.access.sessionExpired") : t("admin.access.deniedHint")
          }
          showContactButton={false}
          onRetry={() => void refresh()}
          retrying={isLoading}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <View style={styles.tabs}>
        {TABS.map((key) => (
          <PressScale
            key={key}
            onPress={() => setTab(key)}
            style={[styles.tab, tab === key ? styles.tabActive : null]}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === key }}
          >
            <CustomText
              style={[styles.tabText, tab === key ? styles.tabTextActive : null]}
            >
              {t(`admin.tabs.${key}`)}
            </CustomText>
          </PressScale>
        ))}
      </View>

      <View style={styles.body}>
        {tab === "overview" ? (
          <OverviewTabContainer
            range={range}
            onChangeRange={setRange}
            onOpenUser={handleOpenUser}
            onOpenUsersTab={() => setTab("users")}
            bottomInset={bottomInset}
          />
        ) : null}
        {tab === "users" ? (
          <UsersTabContainer onOpenUser={handleOpenUser} bottomInset={bottomInset} />
        ) : null}
        {tab === "system" ? <SystemTabContainer bottomInset={bottomInset} /> : null}
      </View>
    </SafeAreaView>
  );
}

export default AdminDashboardScreen;
