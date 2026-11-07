import React from "react";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import GameBottomSheet from "../GameBottomSheet";
import PillButton from "../common/PillButton";
import SheetTitle from "../common/SheetTitle";
import type { GroupFriend } from "../GroupCreateSheet";

const SHEET_FILE = "src/features/social/screens/SocialScreen.tsx";

export type NewChatSheetProps = {
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
  const styles = useThemeStyles((c) => ({
    muted: { color: c.textMuted, fontSize: 12, marginTop: 3 },
  }));

  return (
    <GameBottomSheet visible={visible} onClose={onClose} name="NewChatSheet" file={SHEET_FILE}>
      <SheetTitle title={t("social.chats.new")} />
      {friends.length === 0 ? (
        <CustomText style={styles.muted}>{t("social.friends.empty")}</CustomText>
      ) : (
        friends.map((friend) => (
          <PillButton
            key={friend.uid}
            variant="menu"
            label={friend.displayName}
            onPress={() => onStart(friend.uid)}
            busy={busy}
          />
        ))
      )}
    </GameBottomSheet>
  );
}
