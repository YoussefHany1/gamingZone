import React, { memo } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import PressScale from "@/src/components/PressScale";
import { showConfirmAlert } from "../lib/confirmDialog";
import type { ProfileRelation } from "../lib/relation";

export type ProfileActionBarProps = {
  relation: ProfileRelation;
  onAddFriend: () => Promise<unknown>;
  onCancelRequest: () => Promise<unknown>;
  onAcceptRequest: () => Promise<unknown>;
  onMessage: () => Promise<unknown>;
  onBlock: () => Promise<unknown>;
  onUnblock: () => Promise<unknown>;
};

/**
 * The relationship actions on a public profile. Each action is confirmed with
 * the same cancel/save alert as before, then fired without blocking the UI.
 */
const ProfileActionBar = memo(
  ({
    relation,
    onAddFriend,
    onCancelRequest,
    onAcceptRequest,
    onMessage,
    onBlock,
    onUnblock,
  }: ProfileActionBarProps): React.ReactElement => {
    const { t } = useTranslation();
    const styles = useThemeStyles((c) => ({
      actionRow: { flexDirection: "row", gap: 8, marginTop: 20 },
      actionButton: {
        flex: 1,
        borderRadius: 12,
        backgroundColor: c.accent,
        paddingVertical: 13,
        alignItems: "center",
      },
      dangerButton: {
        flex: 1,
        borderRadius: 12,
        backgroundColor: c.danger,
        paddingVertical: 13,
        alignItems: "center",
      },
      secondaryButton: {
        flex: 1,
        borderRadius: 12,
        backgroundColor: c.surface,
        paddingVertical: 13,
        alignItems: "center",
      },
      actionButtonText: { color: c.onAccent, fontWeight: "700" },
      secondaryButtonText: { color: c.text, fontWeight: "700" },
    }));

    const confirm = (title: string, action: () => Promise<unknown>): void => {
      showConfirmAlert({
        title,
        confirmLabel: t("common.save"),
        cancelLabel: t("common.cancel"),
        onConfirm: () => {
          void action().catch(() => undefined);
        },
      });
    };

    return (
      <View style={styles.actionRow}>
        {relation === "none" ? (
          <PressScale
            style={styles.actionButton}
            onPress={() => confirm(t("social.actions.addFriend"), onAddFriend)}
          >
            <CustomText style={styles.actionButtonText}>
              {t("social.actions.addFriend")}
            </CustomText>
          </PressScale>
        ) : null}

        {relation === "sent" ? (
          <PressScale
            style={styles.secondaryButton}
            onPress={() => confirm(t("social.requests.cancel"), onCancelRequest)}
          >
            <CustomText style={styles.secondaryButtonText}>
              {t("social.requests.cancel")}
            </CustomText>
          </PressScale>
        ) : null}

        {relation === "received" ? (
          <PressScale
            style={styles.actionButton}
            onPress={() => confirm(t("social.requests.accept"), onAcceptRequest)}
          >
            <CustomText style={styles.actionButtonText}>
              {t("social.requests.accept")}
            </CustomText>
          </PressScale>
        ) : null}

        {relation === "friends" ? (
          <PressScale style={styles.actionButton} onPress={() => void onMessage()}>
            <CustomText style={styles.actionButtonText}>
              {t("social.actions.message")}
            </CustomText>
          </PressScale>
        ) : null}

        {relation === "blocked" ? (
          <PressScale
            style={styles.secondaryButton}
            onPress={() => confirm(t("social.actions.unblock"), onUnblock)}
          >
            <CustomText style={styles.secondaryButtonText}>
              {t("social.actions.unblock")}
            </CustomText>
          </PressScale>
        ) : (
          <PressScale
            style={styles.dangerButton}
            onPress={() => confirm(t("social.actions.block"), onBlock)}
          >
            <CustomText style={styles.actionButtonText}>
              {t("social.actions.block")}
            </CustomText>
          </PressScale>
        )}
      </View>
    );
  },
);

ProfileActionBar.displayName = "ProfileActionBar";
export default ProfileActionBar;
