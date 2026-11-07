import React from "react";
import { useTranslation } from "react-i18next";
import GameBottomSheet from "../GameBottomSheet";
import PillButton from "../common/PillButton";
import SheetTitle from "../common/SheetTitle";

const SHEET_FILE = "src/features/social/screens/SocialScreen.tsx";

export type FriendMenuSheetProps = {
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

  return (
    <GameBottomSheet
      visible={uid !== null}
      onClose={onClose}
      name="FriendMenuSheet"
      file={SHEET_FILE}
    >
      {uid && (
        <>
          <SheetTitle title={displayName} />
          <PillButton
            variant="menu"
            label={t("social.actions.viewProfile")}
            onPress={() => onViewProfile(uid)}
          />
          <PillButton
            variant="menu"
            label={t("social.actions.inviteToSession")}
            onPress={() => onInvite(uid)}
            busy={inviting}
          />
          <PillButton
            variant="menu"
            tone="danger"
            label={t("social.actions.removeFriend")}
            onPress={() => onRemove(uid)}
          />
          <PillButton
            variant="menu"
            tone="danger"
            label={t("social.actions.block")}
            onPress={() => onBlock(uid)}
          />
        </>
      )}
    </GameBottomSheet>
  );
}
