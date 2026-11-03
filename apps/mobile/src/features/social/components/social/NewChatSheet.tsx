import React from "react";
import { ActivityIndicator } from "react-native";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import GameBottomSheet from "../GameBottomSheet";
import PressScale from "../PressScale";
import type { GroupFriend } from "../GroupCreateSheet";

const SHEET_FILE = "src/features/social/screens/SocialScreen.tsx";

type NewChatSheetProps = {
  visible: boolean;
  friends: GroupFriend[];
  busy: boolean;
  onClose: () => void;
  onStart: (uid: string) => void;
};

export default function NewChatSheet({
  visible,
  friends,
  busy,
  onClose,
  onStart,
}: NewChatSheetProps): React.ReactElement {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = useThemeStyles((c) => ({
    sheetTitle: { color: c.text, fontSize: 20, fontWeight: "900", marginBottom: 14 },
    muted: { color: c.textMuted, fontSize: 12, marginTop: 3 },
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
  }));

  return (
    <GameBottomSheet visible={visible} onClose={onClose} name="NewChatSheet" file={SHEET_FILE}>
      <CustomText style={styles.sheetTitle}>{t("social.chats.new")}</CustomText>
      {friends.length === 0 ? (
        <CustomText style={styles.muted}>{t("social.friends.empty")}</CustomText>
      ) : (
        friends.map((friend) => (
          <PressScale
            key={friend.uid}
            style={styles.groupCreate}
            onPress={() => onStart(friend.uid)}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color={colors.onAccent} />
            ) : (
              <CustomText style={styles.actionText}>{friend.displayName}</CustomText>
            )}
          </PressScale>
        ))
      )}
    </GameBottomSheet>
  );
}
