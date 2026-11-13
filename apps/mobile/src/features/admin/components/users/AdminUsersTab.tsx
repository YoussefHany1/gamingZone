import React, { memo } from "react";
import { ActivityIndicator, FlatList, RefreshControl, View } from "react-native";
import { Search, ShieldAlert, X } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import CustomTextInput from "@/src/components/CustomTextInput";
import ErrorState from "@/src/components/ErrorState";
import GamingEmptyState from "@/src/components/GamingEmptyState";
import LoadingState from "@/src/components/LoadingState";
import PressScale from "@/src/components/PressScale";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import AdminUserRow from "../AdminUserRow";
import type { AdminApiError } from "../../lib/adminApi";
import type { AdminUserFilter, AdminUserRow as AdminUserRowData } from "../../types";

const FILTERS: AdminUserFilter[] = ["all", "admins", "disabled"];

export type AdminUsersTabProps = {
  query: string;
  setQuery: (value: string) => void;
  filter: AdminUserFilter;
  setFilter: (value: AdminUserFilter) => void;
  rows: AdminUserRowData[];
  mode: string;
  loading: boolean;
  loadingMore: boolean;
  error: AdminApiError | null;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  hasMore: boolean;
  onOpenUser: (uid: string) => void;
  bottomInset: number;
};

const AdminUsersTab = memo(
  ({
    query,
    setQuery,
    filter,
    setFilter,
    rows,
    mode,
    loading,
    loadingMore,
    error,
    refresh,
    loadMore,
    hasMore,
    onOpenUser,
    bottomInset,
  }: AdminUsersTabProps): React.ReactElement => {
    const { t } = useTranslation();
    const colors = useThemeColors();

    const styles = useThemeStyles((c) => ({
      container: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
      searchBox: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 8,
        borderWidth: 1,
        borderColor: c.border,
        backgroundColor: c.surface,
        borderRadius: 12,
        paddingHorizontal: 12,
        minHeight: 46,
      },
      input: {
        flex: 1,
        color: c.text,
        fontSize: 14,
        paddingVertical: 10,
      },
      hint: { color: c.textSubtle, fontSize: 11, marginTop: 6, marginBottom: 10 },
      filterRow: {
        flexDirection: "row" as const,
        gap: 8,
        marginBottom: 12,
        flexWrap: "wrap" as const,
      },
      chip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: c.border,
        backgroundColor: c.surface,
      },
      chipActive: { backgroundColor: c.accent, borderColor: c.accent },
      chipText: { color: c.textMuted, fontSize: 12, fontWeight: "600" as const },
      chipTextActive: { color: c.onAccent },
      resultLabel: { color: c.textMuted, fontSize: 12, marginBottom: 4 },
      footer: { paddingVertical: 16, alignItems: "center" as const },
      footerText: { color: c.accentText, fontSize: 13, fontWeight: "700" as const },
      listContent: { paddingBottom: bottomInset },
    }));

    const listHeader = (
      <View>
        <View style={styles.searchBox}>
          <Search size={17} color={colors.textMuted} />
          <CustomTextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t("admin.users.searchPlaceholder")}
            placeholderTextColor={colors.textSubtle}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            style={styles.input}
            accessibilityLabel={t("admin.users.searchPlaceholder")}
          />
          {query.length > 0 ? (
            <PressScale onPress={() => setQuery("")} accessibilityRole="button">
              <X size={17} color={colors.textMuted} />
            </PressScale>
          ) : null}
        </View>

        <CustomText style={styles.hint}>{t("admin.users.searchHint")}</CustomText>

        <View style={styles.filterRow}>
          {FILTERS.map((key) => (
            <PressScale
              key={key}
              onPress={() => setFilter(key)}
              style={[styles.chip, filter === key ? styles.chipActive : null]}
              accessibilityRole="button"
            >
              <CustomText
                style={[styles.chipText, filter === key ? styles.chipTextActive : null]}
              >
                {t(`admin.users.filters.${key}`)}
              </CustomText>
            </PressScale>
          ))}
        </View>

        <CustomText style={styles.resultLabel}>
          {mode === "search"
            ? t("admin.users.count", { count: rows.length })
            : t("admin.users.browse")}
        </CustomText>
      </View>
    );

    if (loading && rows.length === 0) {
      return (
        <View style={styles.container}>
          {listHeader}
          <LoadingState />
        </View>
      );
    }

    if (error && rows.length === 0) {
      return (
        <View style={styles.container}>
          {listHeader}
          <ErrorState
            message={t("admin.errors.generic")}
            subMessage={error.message}
            showContactButton={false}
            onRetry={() => void refresh()}
            retrying={loading}
          />
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <FlatList
          data={rows}
          keyExtractor={(item) => item.uid}
          renderItem={({ item }) => (
            <AdminUserRow user={item} onPress={() => onOpenUser(item.uid)} />
          )}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            <GamingEmptyState
              icon={ShieldAlert}
              title={
                query.trim().length > 0
                  ? t("admin.users.empty")
                  : t("admin.overview.recentUsers.empty")
              }
            />
          }
          ListFooterComponent={
            hasMore ? (
              <View style={styles.footer}>
                {loadingMore ? (
                  <ActivityIndicator color={colors.accentText} />
                ) : (
                  <PressScale onPress={() => void loadMore()} accessibilityRole="button">
                    <CustomText style={styles.footerText}>
                      {t("admin.users.loadMore")}
                    </CustomText>
                  </PressScale>
                )}
              </View>
            ) : (
              <View style={{ height: 12 }} />
            )
          }
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={
            <RefreshControl
              refreshing={loading && rows.length > 0}
              onRefresh={() => void refresh()}
              tintColor={colors.accentText}
              colors={[colors.accentText]}
            />
          }
        />
      </View>
    );
  },
);

AdminUsersTab.displayName = "AdminUsersTab";
export default AdminUsersTab;
