import React, { memo } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import AdminBadge from "./AdminBadge";
import { formatAdminDateTime } from "../lib/format";
import type { AdminAuditEntry } from "../types";

export type AdminAuditListProps = {
  entries: AdminAuditEntry[];
  emptyLabel: string;
};

const ACTION_TONE: Record<string, "admin" | "disabled" | "verified" | "neutral"> = {
  promote: "admin",
  demote: "neutral",
  disable: "disabled",
  enable: "verified",
};

/** Recent admin actions, newest first. */
const AdminAuditList = memo(
  ({ entries, emptyLabel }: AdminAuditListProps): React.ReactElement => {
    const { t, i18n } = useTranslation();
    const styles = useThemeStyles((c) => ({
      empty: { color: c.textMuted, fontSize: 12 },
      row: {
        paddingVertical: 9,
        borderBottomWidth: 1,
        borderBottomColor: c.border,
        gap: 4,
      },
      topRow: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        justifyContent: "space-between" as const,
        gap: 8,
      },
      action: { color: c.text, fontSize: 13, fontWeight: "700" as const },
      date: { color: c.textSubtle, fontSize: 11 },
      detail: { color: c.textMuted, fontSize: 12 },
    }));

    if (entries.length === 0) {
      return <CustomText style={styles.empty}>{emptyLabel}</CustomText>;
    }

    return (
      <View>
        {entries.map((entry) => (
          <View key={entry.id} style={styles.row}>
            <View style={styles.topRow}>
              <AdminBadge
                tone={ACTION_TONE[entry.action] ?? "neutral"}
                label={t(`admin.audit.actions.${entry.action}`, {
                  defaultValue: entry.action,
                })}
              />
              <CustomText style={styles.date}>
                {formatAdminDateTime(entry.createdAt, i18n.language)}
              </CustomText>
            </View>
            <CustomText style={styles.detail} numberOfLines={1}>
              {t("admin.audit.by", {
                actor: entry.actorEmail || entry.actorUid || t("admin.audit.unknownActor"),
              })}
            </CustomText>
            <CustomText style={styles.detail} numberOfLines={1}>
              {t("admin.audit.target", {
                target:
                  entry.targetEmail || entry.targetUid || t("admin.audit.unknownTarget"),
              })}
            </CustomText>
          </View>
        ))}
      </View>
    );
  },
);

AdminAuditList.displayName = "AdminAuditList";
export default AdminAuditList;
