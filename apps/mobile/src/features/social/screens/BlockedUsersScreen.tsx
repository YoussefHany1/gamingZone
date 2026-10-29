import React, { useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { FlashList } from "@shopify/flash-list";
import firestore from "@react-native-firebase/firestore";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import CustomText from "@/src/components/CustomText";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useAuthStore } from "@/src/store/useAuthStore";
import { logger } from "@/src/lib/logger";
import { unblockUser } from "../lib/friendService";
import type { SettingsStackParamList } from "@/src/navigation/AppNavigator";

interface BlockedUser {
  uid: string;
  handle: string;
  displayName: string;
  photoURL: string | null;
}

export default function BlockedUsersScreen(): React.ReactElement {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const uid = useAuthStore((state) => state.user?.uid ?? "");
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const styles = useThemeStyles((c) => ({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: 16 },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      padding: 14,
      marginBottom: 8,
      borderRadius: 12,
      backgroundColor: c.surface,
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
    empty: { alignItems: "center", paddingVertical: 48 },
    emptyText: { color: c.textMuted },
    loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  }));

  const loadBlockedUsers = async (showRefresh = false) => {
    if (!uid) return;
    if (showRefresh) setRefreshing(true);

    try {
      const snapshot = await firestore()
        .collection("blocks")
        .doc(uid)
        .collection("uids")
        .get();

      const users: BlockedUser[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          uid: doc.id,
          handle: typeof data.handle === "string" ? data.handle : "",
          displayName: typeof data.displayName === "string" ? data.displayName : "Player",
          photoURL: typeof data.photoURL === "string" ? data.photoURL : null,
        };
      });

      setBlockedUsers(users);
    } catch (error) {
      logger.error("[BlockedUsers] Failed to load blocked users", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadBlockedUsers();
  }, [uid]);

  const handleUnblock = async (otherUid: string) => {
    try {
      await unblockUser(otherUid);
      setBlockedUsers((prev) => prev.filter((user) => user.uid !== otherUid));
    } catch (error) {
      logger.error("[BlockedUsers] Unblock failed", error);
    }
  };

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
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
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
        ListEmptyComponent={
          <View style={styles.empty}>
            <CustomText style={styles.emptyText}>
              {t("social.blockedUsers.empty")}
            </CustomText>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate("UserProfile", { uid: item.uid })}
          >
            <View style={styles.rowText}>
              <CustomText style={styles.rowText}>{item.displayName}</CustomText>
              {item.handle ? (
                <CustomText style={styles.muted}>@{item.handle}</CustomText>
              ) : null}
            </View>
            <TouchableOpacity
              style={styles.unblockButton}
              onPress={() => void handleUnblock(item.uid)}
            >
              <CustomText style={styles.unblockButtonText}>
                {t("social.actions.unblock")}
              </CustomText>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}
