import React, { memo } from "react";
import { I18nManager, View } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import PressScale from "@/src/components/PressScale";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import GamerAvatar from "@/src/features/social/components/GamerAvatar";
import AdminBadge from "./AdminBadge";
import { formatAdminDate } from "../lib/format";
import type { AdminUserRow as AdminUserRowData } from "../types";

export type AdminUserRowProps = {
  user: AdminUserRowData;
  onPress: () => void;
};

/** One row in the Users tab. */
const AdminUserRow = memo(
  ({ user, onPress }: AdminUserRowProps): React.ReactElement => {
    const { t, i18n } = useTranslation();
    const colors = useThemeColors();

    const styles = useThemeStyles((c) => ({
      row: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 12,
        paddingVertical: 10,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: c.border,
      },
      body: { flex: 1, minWidth: 0 },
      nameRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 6 },
      name: { color: c.text, fontSize: 15, fontWeight: "700" as const, flexShrink: 1 },
      secondary: { color: c.textMuted, fontSize: 12, marginTop: 2 },
      meta: { color: c.textSubtle, fontSize: 11, marginTop: 4 },
      badges: {
        flexDirection: "row" as const,
        flexWrap: "wrap" as const,
        gap: 4,
        marginTop: 5,
      },
    }));

    const displayName = user.displayName || user.handle || user.uid.slice(0, 10);
    const secondary = user.email || (user.handle ? `@${user.handle}` : user.uid);
    const joined = user.createdAt
      ? t("admin.users.joined", {
          date: formatAdminDate(user.createdAt, i18n.language),
        })
      : t("admin.users.unknownJoin");

    const Chevron = I18nManager.isRTL ? ChevronLeft : ChevronRight;

    return (
      <PressScale onPress={onPress} style={styles.row} accessibilityRole="button">
        <GamerAvatar photoURL={user.photoURL} size={42} />
        <View style={styles.body}>
          <View style={styles.nameRow}>
            <CustomText style={styles.name} numberOfLines={1}>
              {displayName}
            </CustomText>
          </View>
          <CustomText style={styles.secondary} numberOfLines={1}>
            {secondary}
          </CustomText>
          <CustomText style={styles.meta} numberOfLines={1}>
            {joined}
          </CustomText>

          {(user.isAdmin || user.disabled || user.emailVerified) && (
            <View style={styles.badges}>
              {user.isAdmin ? (
                <AdminBadge tone="admin" label={t("admin.users.badges.admin")} />
              ) : null}
              {user.disabled ? (
                <AdminBadge tone="disabled" label={t("admin.users.badges.disabled")} />
              ) : null}
              {user.emailVerified ? (
                <AdminBadge tone="verified" label={t("admin.users.badges.verified")} />
              ) : null}
            </View>
          )}
        </View>
        <Chevron size={18} color={colors.textSubtle} />
      </PressScale>
    );
  },
);

AdminUserRow.displayName = "AdminUserRow";
export default AdminUserRow;
