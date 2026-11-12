import React, { useCallback, useState } from "react";
import { Alert } from "@/src/lib/alert";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import CustomTextInput from "@/src/components/CustomTextInput";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import GameBottomSheet from "./GameBottomSheet";
import PillButton from "./common/PillButton";
import SheetTitle from "./common/SheetTitle";
import SocialListRow from "./SocialListRow";

export type GroupFriend = {
  uid: string;
  displayName: string;
  photoURL?: string | null;
};

export type GroupCreateSheetProps = {
  visible: boolean;
  onClose: () => void;
  friends: GroupFriend[];
  onCreate: (title: string, memberUids: string[]) => Promise<void>;
};

/**
 * Group-name + member picker. Owns the transient form state so the social
 * screen does not re-render the whole list on every keystroke.
 */
export default function GroupCreateSheet({
  visible,
  onClose,
  friends,
  onCreate,
}: GroupCreateSheetProps): React.ReactElement {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [title, setTitle] = useState("");
  const [selectedUids, setSelectedUids] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const styles = useThemeStyles((c) => ({
    input: {
      color: c.text,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 12,
      borderRadius: 13,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    selectText: { color: c.textMuted, fontSize: 12 },
    selectedText: { color: c.accentText },
  }));

  const toggleFriend = useCallback((friendUid: string) => {
    setSelectedUids((current) =>
      current.includes(friendUid)
        ? current.filter((id) => id !== friendUid)
        : [...current, friendUid],
    );
  }, []);

  const submit = async (): Promise<void> => {
    if (!title.trim() || selectedUids.length === 0 || busy) return;

    setBusy(true);
    try {
      await onCreate(title, selectedUids);
      setTitle("");
      setSelectedUids([]);
      onClose();
    } catch {
      Alert.alert(t("social.errors.chat"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <GameBottomSheet
      visible={visible}
      onClose={onClose}
      name="GroupCreateSheet"
      file="src/features/social/components/GroupCreateSheet.tsx"
    >
      <SheetTitle title={t("social.groups.create")} />
      <CustomTextInput
        value={title}
        onChangeText={setTitle}
        placeholder={t("social.groups.name")}
        placeholderTextColor={colors.textMuted}
        style={styles.input}
      />
      {friends.map((friend) => {
        const selected = selectedUids.includes(friend.uid);
        return (
          <SocialListRow
            key={friend.uid}
            photoURL={friend.photoURL}
            label={friend.displayName}
            selected={selected}
            onPress={() => toggleFriend(friend.uid)}
            trailing={
              <CustomText style={[styles.selectText, selected && styles.selectedText]}>
                {selected ? t("social.groups.selected") : t("social.groups.select")}
              </CustomText>
            }
          />
        );
      })}
      <PillButton
        label={busy ? t("social.groups.creating") : t("social.groups.create")}
        onPress={() => void submit()}
        disabled={busy}
      />
    </GameBottomSheet>
  );
}
