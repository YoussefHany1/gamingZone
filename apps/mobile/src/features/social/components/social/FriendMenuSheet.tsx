import React from "react";
import { ActivityIndicator } from "react-native";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import GameBottomSheet from "../GameBottomSheet";
import PressScale from "../PressScale";

const SHEET_FILE = "src/features/social/screens/SocialScreen.tsx";

type FriendMenuSheetProps = {
  uid: string | null;
  displayName: string;
  inviting: boolean;
  onClose: () => void;
  onViewProfile: (uid: string) => void;
  onInvite: (uid: string) => void;
  onRemove: (uid: string) => void;
  onBlock: (uid: string) => void;
};

export default function FriendMenuSheet({
  uid,
  displayName,
  inviting,
  onClose,
  onViewProfile,
  onInvite,
  onRemove,
  onBlock,
}: FriendMenuSheetProps): React.ReactElement {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = useThemeStyles((c) => ({
    sheetTitle: { color: c.text, fontSize: 20, fontWeight: "900", marginBottom: 14 },
    groupCreate: {
      minHeight: 40,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
      paddingHorizontal: 12,
      borderRadius: 11,
      backgroundColor: c.accent,
      marginBottom: 14,
    },
    actionText: { color: c.onAccent, fontSize: 12, fontWeight: "800" },
    dangerAction: { backgroundColor: c.danger },
  }));

  return (
    <GameBottomSheet
      visible={uid !== null}
      onClose={onClose}
      name="FriendMenuSheet"
      file={SHEET_FILE}
    >
      {uid && (
        <>
          <CustomText style={styles.sheetTitle}>{displayName}</CustomText>
          <PressScale style={styles.groupCreate} onPress={() => onViewProfile(uid)}>
            <CustomText style={styles.actionText}>{t("social.actions.viewProfile")}</CustomText>
          </PressScale>
          <PressScale
            style={styles.groupCreate}
            onPress={() => onInvite(uid)}
            disabled={inviting}
          >
            {inviting ? (
              <ActivityIndicator color={colors.onAccent} />
            ) : (
              <CustomText style={styles.actionText}>
                {t("social.actions.inviteToSession")}
              </CustomText>
            )}
          </PressScale>
          <PressScale
            style={[styles.groupCreate, styles.dangerAction]}
            onPress={() => onRemove(uid)}
          >
            <CustomText style={styles.actionText}>{t("social.actions.removeFriend")}</CustomText>
          </PressScale>
          <PressScale
            style={[styles.groupCreate, styles.dangerAction]}
            onPress={() => onBlock(uid)}
          >
            <CustomText style={styles.actionText}>{t("social.actions.block")}</CustomText>
          </PressScale>
        </>
      )}
    </GameBottomSheet>
  );
}
