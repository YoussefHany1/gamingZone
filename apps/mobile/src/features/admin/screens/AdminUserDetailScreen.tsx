import React, { useCallback, useEffect, useState } from "react";
import type { RouteProp } from "@react-navigation/native";
import { useRoute } from "@react-navigation/native";
import { ActivityIndicator, RefreshControl, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ShieldCheck, ShieldOff, UserX, type LucideIcon } from "lucide-react-native";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import ErrorState from "@/src/components/ErrorState";
import LoadingState from "@/src/components/LoadingState";
import PressScale from "@/src/components/PressScale";
import { Alert } from "@/src/lib/alert";
import { showToast } from "@/src/lib/toast";
import { useAdminAccess } from "@/src/hooks/useIsAdmin";
import { useBottomInset } from "@/src/hooks/useBottomInset";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useAuthStore } from "@/src/store/useAuthStore";
import type { SettingsStackParamList } from "@/src/navigation/AppNavigator";
import GamerAvatar from "@/src/features/social/components/GamerAvatar";
import AdminAuditList from "../components/AdminAuditList";
import AdminBadge from "../components/AdminBadge";
import AdminSection from "../components/AdminSection";
import { useAdminUserActions } from "../hooks/useAdminUserActions";
import { useAdminUserDetail } from "../hooks/useAdminUserDetail";
import type { AdminApiError } from "../lib/adminApi";
import {
  formatAdminAuthDate,
  formatAdminDate,
} from "../lib/format";

type DetailRoute = RouteProp<SettingsStackParamList, "AdminUserDetail">;

function errorMessage(error: AdminApiError | null, t: TFunction) {
  if (!error) return "";
  if (error.status === 0) return t("admin.errors.network_error");
  if (error.code) {
    return t(`admin.errors.${error.code}`, { defaultValue: error.message });
  }
  return error.message;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const styles = useThemeStyles((c) => ({
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
  }));

  return (
    <View style={styles.row}>
      <CustomText style={styles.label}>{label}</CustomText>
      <CustomText style={styles.value}>{value}</CustomText>
    </View>
  );
}

function ActionButton({
  label,
  tone,
  onPress,
  disabled,
  loading,
  icon: Icon,
}: {
  label: string;
  tone: "danger" | "accent";
  onPress: () => void;
  disabled: boolean;
  loading: boolean;
  icon: LucideIcon;
}) {
  const colors = useThemeColors();
  const styles = useThemeStyles((c) => ({
    button: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      marginTop: 10,
      backgroundColor: tone === "danger" ? c.danger : c.accent,
      opacity: disabled ? 0.6 : 1,
    },
    text: { color: tone === "danger" ? "#ffffff" : c.onAccent, fontSize: 14, fontWeight: "700" as const },
  }));

  return (
    <PressScale
      onPress={onPress}
      disabled={disabled}
      style={styles.button}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.onAccent} />
      ) : (
        <Icon size={17} color={tone === "danger" ? "#ffffff" : colors.onAccent} />
      )}
      <CustomText style={styles.text}>{label}</CustomText>
    </PressScale>
  );
}

function AdminUserDetailScreen(): React.ReactElement {
  const { t, i18n } = useTranslation();
  const route = useRoute<DetailRoute>();
  const uid = route.params.uid;
  const colors = useThemeColors();
  const bottomInset = useBottomInset();
  const currentUid = useAuthStore((state) => state.user?.uid ?? null);

  const access = useAdminAccess();
  const detail = useAdminUserDetail(uid);
  const { refresh: refreshDetail } = detail;
  const [actionError, setActionError] = useState<AdminApiError | null>(null);

  const handleActionSuccess = useCallback(() => {
    void refreshDetail();
  }, [refreshDetail]);

  const actions = useAdminUserActions(handleActionSuccess);
  const { setAdmin, setDisabled, error: actionFailure, clearError, pending } = actions;

  const styles = useThemeStyles((c) => ({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: 16, paddingBottom: 24 },
    hero: { flexDirection: "row" as const, alignItems: "center" as const, gap: 12 },
    heroBody: { flex: 1, minWidth: 0 },
    name: { color: c.text, fontSize: 18, fontWeight: "800" as const },
    secondary: { color: c.textMuted, fontSize: 13, marginTop: 2 },
    badges: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      gap: 5,
      marginTop: 7,
    },
    hint: { color: c.textSubtle, fontSize: 11, marginTop: 8 },
    empty: { color: c.textMuted, fontSize: 12 },
    countRow: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      justifyContent: "space-between" as const,
    },
    countCell: {
      flexBasis: "31%" as const,
      flexGrow: 1,
      backgroundColor: c.accentSurface,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 8,
      marginBottom: 8,
      alignItems: "center" as const,
    },
    countValue: { color: c.text, fontSize: 18, fontWeight: "800" as const },
    countLabel: { color: c.textMuted, fontSize: 10, marginTop: 2, textAlign: "center" as const },
  }));

  const confirm = useCallback(
    (
      title: string,
      message: string,
      confirmLabel: string,
      onConfirm: () => void,
    ) => {
      Alert.alert(title, message, [
        { text: t("admin.detail.actions.cancel"), style: "cancel" },
        { text: confirmLabel, onPress: onConfirm },
      ]);
    },
    [t],
  );

  const runAction = useCallback(
    async (kind: "admin" | "disabled", next: boolean): Promise<void> => {
      setActionError(null);
      const ok =
        kind === "admin"
          ? await setAdmin(uid, next)
          : await setDisabled(uid, next);

      if (ok) {
        showToast(t("admin.detail.actions.success"));
      }
    },
    [setAdmin, setDisabled, t, uid],
  );

  // Surface the last action failure as an alert once, without blocking render.
  useEffect(() => {
    if (!actionFailure) return;
    setActionError(actionFailure);
    Alert.alert(
      t("admin.detail.actions.failed"),
      errorMessage(actionFailure, t),
    );
    clearError();
  }, [actionFailure, clearError, t]);

  if (access.isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["left", "right"]}>
        <LoadingState label={t("admin.access.checking")} />
      </SafeAreaView>
    );
  }

  if (!access.isAdmin) {
    return (
      <SafeAreaView style={styles.container} edges={["left", "right"]}>
        <ErrorState
          icon={ShieldOff}
          iconColor={colors.danger}
          message={t("admin.access.denied")}
          subMessage={t("admin.access.deniedHint")}
          showContactButton={false}
          onRetry={() => void access.refresh()}
          retrying={access.isLoading}
        />
      </SafeAreaView>
    );
  }

  if (detail.loading && !detail.data) {
    return (
      <SafeAreaView style={styles.container} edges={["left", "right"]}>
        <LoadingState />
      </SafeAreaView>
    );
  }

  if ((detail.error || !detail.data) && !detail.data) {
    return (
      <SafeAreaView style={styles.container} edges={["left", "right"]}>
        <ErrorState
          message={t("admin.errors.generic")}
          subMessage={errorMessage(detail.error, t)}
          showContactButton={false}
          onRetry={() => void detail.refresh()}
          retrying={detail.refreshing}
        />
      </SafeAreaView>
    );
  }

  const data = detail.data;
  if (!data) return <View style={styles.container} />;

  const { user, auth, counts, linkedAccounts, recentAudit } = data;
  const isSelf = user.uid === currentUid;
  const isAdmin = auth.customClaims?.admin ?? user.isAdmin;
  const isDisabled = auth.disabled ?? user.disabled;
  const displayName = user.displayName || user.handle || user.uid.slice(0, 10);
  const providers = (auth.providers ?? []).join(", ") || "—";

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]}
        refreshControl={
          <RefreshControl
            refreshing={detail.refreshing}
            onRefresh={() => void detail.refresh()}
            tintColor={colors.accentText}
            colors={[colors.accentText]}
          />
        }
      >
        <AdminSection>
          <View style={styles.hero}>
            <GamerAvatar photoURL={user.photoURL} size={58} />
            <View style={styles.heroBody}>
              <CustomText style={styles.name} numberOfLines={1}>
                {displayName}
              </CustomText>
              <CustomText style={styles.secondary} numberOfLines={1}>
                {user.email || t("admin.users.noEmail")}
              </CustomText>
              <View style={styles.badges}>
                {isAdmin ? (
                  <AdminBadge tone="admin" label={t("admin.users.badges.admin")} />
                ) : null}
                {isDisabled ? (
                  <AdminBadge tone="disabled" label={t("admin.users.badges.disabled")} />
                ) : null}
                {auth.emailVerified ? (
                  <AdminBadge tone="verified" label={t("admin.users.badges.verified")} />
                ) : null}
                {isSelf ? (
                  <AdminBadge tone="neutral" label={t("admin.detail.you")} />
                ) : null}
              </View>
            </View>
          </View>
          {actionError ? (
            <CustomText style={styles.hint}>{errorMessage(actionError, t)}</CustomText>
          ) : null}
        </AdminSection>

        <AdminSection title={t("admin.detail.account")}>
          <DetailRow label={t("admin.detail.fields.uid")} value={user.uid} />
          <DetailRow
            label={t("admin.detail.fields.email")}
            value={user.email || "—"}
          />
          <DetailRow
            label={t("admin.detail.fields.handle")}
            value={user.handle ? `@${user.handle}` : "—"}
          />
          <DetailRow
            label={t("admin.detail.fields.joined")}
            value={formatAdminDate(user.createdAt, i18n.language)}
          />
          <DetailRow
            label={t("admin.detail.fields.lastSignIn")}
            value={formatAdminAuthDate(auth.lastSignIn, i18n.language)}
          />
          <DetailRow
            label={t("admin.detail.fields.providers")}
            value={providers}
          />
          <DetailRow
            label={t("admin.detail.fields.platform")}
            value={user.platform || "—"}
          />
          <DetailRow
            label={t("admin.detail.fields.country")}
            value={user.country || "—"}
          />
          <DetailRow
            label={t("admin.detail.fields.status")}
            value={
              isDisabled
                ? t("admin.users.badges.disabled")
                : t("admin.detail.fields.active")
            }
          />
        </AdminSection>

        <AdminSection title={t("admin.detail.counts")}>
          <View style={styles.countRow}>
            {(
              [
                ["lists", counts.lists],
                ["ratings", counts.ratings],
                ["friends", counts.friends],
                ["conversations", counts.conversations],
                ["sessions", counts.sessions],
              ] as const
            ).map(([key, value]) => (
              <View key={key} style={styles.countCell}>
                <CustomText style={styles.countValue}>{value}</CustomText>
                <CustomText style={styles.countLabel}>
                  {t(`admin.detail.fields.${key}`)}
                </CustomText>
              </View>
            ))}
          </View>
        </AdminSection>

        <AdminSection title={t("admin.detail.linked")}>
          {linkedAccounts.length === 0 ? (
            <CustomText style={styles.empty}>{t("admin.detail.linkedEmpty")}</CustomText>
          ) : (
            linkedAccounts.map((account) => (
              <DetailRow
                key={account.platform}
                label={account.platform}
                value={[
                  account.status ?? "—",
                  account.linkedAt
                    ? formatAdminDate(account.linkedAt, i18n.language)
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              />
            ))
          )}
        </AdminSection>

        {!isSelf ? (
          <AdminSection title={t("admin.detail.actions.title")}>
            <ActionButton
              icon={isAdmin ? ShieldOff : ShieldCheck}
              tone={isAdmin ? "danger" : "accent"}
              label={
                isAdmin
                  ? t("admin.detail.actions.demote")
                  : t("admin.detail.actions.promote")
              }
              disabled={pending !== null}
              loading={pending === "admin"}
              onPress={() =>
                confirm(
                  isAdmin
                    ? t("admin.detail.actions.demoteTitle")
                    : t("admin.detail.actions.promoteTitle"),
                  isAdmin
                    ? t("admin.detail.actions.demoteMessage")
                    : t("admin.detail.actions.promoteMessage"),
                  isAdmin
                    ? t("admin.detail.actions.demote")
                    : t("admin.detail.actions.promote"),
                  () => void runAction("admin", !isAdmin),
                )
              }
            />

            <ActionButton
              icon={UserX}
              tone={isDisabled ? "accent" : "danger"}
              label={
                isDisabled
                  ? t("admin.detail.actions.enable")
                  : t("admin.detail.actions.disable")
              }
              disabled={pending !== null}
              loading={pending === "disabled"}
              onPress={() =>
                confirm(
                  isDisabled
                    ? t("admin.detail.actions.enableTitle")
                    : t("admin.detail.actions.disableTitle"),
                  isDisabled
                    ? t("admin.detail.actions.enableMessage")
                    : t("admin.detail.actions.disableMessage"),
                  isDisabled
                    ? t("admin.detail.actions.enable")
                    : t("admin.detail.actions.disable"),
                  () => void runAction("disabled", !isDisabled),
                )
              }
            />
          </AdminSection>
        ) : null}

        <AdminSection title={t("admin.detail.audit")}>
          <AdminAuditList
            entries={recentAudit}
            emptyLabel={t("admin.detail.auditEmpty")}
          />
        </AdminSection>
      </ScrollView>
    </SafeAreaView>
  );
}

export default AdminUserDetailScreen;
