import React, { memo, useCallback } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  View,
} from "react-native";
import { Alert } from "@/src/lib/alert";
import GamerAvatar from "@/src/features/social/components/GamerAvatar";
import GamingEmptyState from "@/src/components/GamingEmptyState";
import { Ban } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { FlashList } from "@shopify/flash-list";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import CustomText from "@/src/components/CustomText";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useAuthStore } from "@/src/store/useAuthStore";
import { logger } from "@/src/lib/logger";
import { unblockUser } from "@/src/features/social/lib/friendService";
import {
  useBlockedUsers,
  type BlockedUser,
} from "@/src/features/social/hooks/useBlockedUsers";
import type { SettingsStackParamList } from "@/src/navigation/AppNavigator";

type BlockedUserRowProps = {
  user: BlockedUser;
  onOpen: (uid: string) => void;
  onUnblock: (uid: string) => void;
};

const BlockedUserRow = memo(
  ({ user, onOpen, onUnblock }: BlockedUserRowProps): React.ReactElement => {
    const { t } = useTranslation();
    const styles = useThemeStyles((c) => ({
      row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 13,
        marginBottom: 10,
        borderRadius: 18,
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.border,
      },
      rowText: { flex: 1, color: c.text },
      muted: { color: c.textMuted, fontSize: 13, marginTop: 2 },
      unblockButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: c.accent,
      },
      unblockButtonText: { color: c.onAccent, fontSize: 13, fontWeight: "600" },
    }));

    return (
      <TouchableOpacity style={styles.row} onPress={() => onOpen(user.uid)}>
        <GamerAvatar photoURL={user.photoURL} size={46} />
        <View style={styles.rowText}>
          <CustomText style={styles.rowText}>{user.displayName}</CustomText>
          {user.handle ? (
            <CustomText style={styles.muted}>@{user.handle}</CustomText>
          ) : null}
        </View>
        <TouchableOpacity
          style={styles.unblockButton}
          onPress={() => onUnblock(user.uid)}
        >
          <CustomText style={styles.unblockButtonText}>
            {t("social.actions.unblock")}
          </CustomText>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  },
);

BlockedUserRow.displayName = "BlockedUserRow";

export default function BlockedUsersScreen(): React.ReactElement {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const uid = useAuthStore((state) => state.user?.uid ?? "");
  const { blockedUsers, loading, refreshing, loadBlockedUsers } = useBlockedUsers(uid);

  const styles = useThemeStyles((c) => ({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: 16 },
    header: { color: c.text, fontSize: 22, fontWeight: "900", marginBottom: 5 },
    intro: { color: c.textMuted, fontSize: 13, marginBottom: 18 },
    loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  }));

  const openProfile = useCallback(
    (targetUid: string) => navigation.navigate("UserProfile", { uid: targetUid }),
    [navigation],
  );

  const handleUnblock = useCallback(
    async (otherUid: string): Promise<void> => {
      try {
        await unblockUser(otherUid);
        await loadBlockedUsers();
      } catch (error) {
        logger.error("[BlockedUsers] Unblock failed", error);
      }
    },
    [loadBlockedUsers],
  );

  const confirmUnblock = useCallback(
    (otherUid: string): void => {
      Alert.alert(
        t("social.blockedUsers.confirmTitle"),
        t("social.blockedUsers.confirmMessage"),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("social.actions.unblock"),
            onPress: () => void handleUnblock(otherUid),
          },
        ],
      );
    },
    [handleUnblock, t],
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlashList
        data={blockedUsers}
        keyExtractor={(item) => item.uid}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadBlockedUsers(true)}
            tintColor={colors.accent}
          />
        }
        ListEmptyComponent={<GamingEmptyState title={t("social.blockedUsers.empty")} icon={Ban} />}
        renderItem={({ item }) => (
          <BlockedUserRow user={item} onOpen={openProfile} onUnblock={confirmUnblock} />
        )}
      />
    </SafeAreaView>
  );
}
