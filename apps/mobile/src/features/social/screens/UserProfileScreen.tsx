import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import firestore from "@react-native-firebase/firestore";
import { blockedPairId, friendRequestId, friendshipId } from "@gaming-zone/core";
import {
  blockUser,
  cancelFriendRequest,
  respondFriendRequest,
  sendFriendRequest,
  unblockUser,
  getOrCreateDirectConversation,
} from "../lib/friendService";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import ErrorState from "@/src/components/ErrorState";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useAuthStore } from "@/src/store/useAuthStore";
import { logger } from "@/src/lib/logger";
import type { SettingsStackParamList } from "@/src/navigation/AppNavigator";
import { usePublicProfile } from "../hooks/usePublicProfile";
import { deriveRelation, emptyRelationState, type RelationState } from "../lib/relation";
import PublicProfileHeader from "../components/PublicProfileHeader";
import PublicLinksCard from "../components/PublicLinksCard";

/**
 * Public profile by uid or handle.
 *
 * Phase 2 opens this from friends and search results; Phase 1 opens it from the
 * user's own profile menu so the projection can be previewed before handles are
 * searchable.
 */
function UserProfileScreen(): React.ReactElement {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const route = useRoute<RouteProp<SettingsStackParamList, "UserProfile">>();

  const uid = route.params?.uid ?? "";
  const handle = route.params?.handle ?? "";
  const currentUid = useAuthStore((state) => state.user?.uid ?? "");

  const params = useMemo(
    () => (uid ? { uid } : { ...(handle ? { handle } : {}) }),
    [uid, handle],
  );

  const { profile, loading, error } = usePublicProfile(params);
  const [relationState, setRelationState] = useState<RelationState>(emptyRelationState);
  const otherUid = profile?.uid ?? uid;
  const relation = deriveRelation(relationState);

  useEffect(() => {
    setRelationState(emptyRelationState);
    if (!currentUid || !otherUid || currentUid === otherUid) return;

    // Two handlers, not one. With RNFirebase's single-callback form an error is
    // delivered as `(null, error)`, so `snapshot.data()` used to throw
    // "Cannot read property 'data' of null". The explicit error handler keeps
    // failures (for example a rules denial on another user's pair document) out
    // of the render path.
    const onListenerError = (listenerError: unknown): void => {
      logger.warn("[social] Relation listener failed", listenerError);
    };

    const stops = [
      firestore()
        .collection("friendships")
        .doc(friendshipId(currentUid, otherUid))
        .onSnapshot(
          (snap) =>
            setRelationState((previous) => ({
              ...previous,
              friendshipActive: snap?.data()?.status === "active",
            })),
          onListenerError,
        ),
      firestore()
        .collection("friendRequests")
        .doc(friendRequestId(currentUid, otherUid))
        .onSnapshot(
          (snap) =>
            setRelationState((previous) => ({
              ...previous,
              requestSent: snap?.data()?.status === "pending",
            })),
          onListenerError,
        ),
      firestore()
        .collection("friendRequests")
        .doc(friendRequestId(otherUid, currentUid))
        .onSnapshot(
          (snap) =>
            setRelationState((previous) => ({
              ...previous,
              requestReceived: snap?.data()?.status === "pending",
            })),
          onListenerError,
        ),
      firestore()
        .collection("blockedPairs")
        .doc(blockedPairId(currentUid, otherUid))
        .onSnapshot(
          (snap) =>
            setRelationState((previous) => ({
              ...previous,
              blocked: Boolean(snap?.exists()),
            })),
          onListenerError,
        ),
    ];
    return () => stops.forEach((stop) => stop());
  }, [currentUid, otherUid]);

  const runSocialAction = (action: () => Promise<unknown>, message: string): void => {
    Alert.alert(message, undefined, [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.save"), onPress: () => void action().catch(() => undefined) },
    ]);
  };

  const styles = useThemeStyles((c) => ({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: 20, paddingBottom: 60 },
    centered: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    },
    editButton: {
      marginTop: 20,
      borderRadius: 12,
      backgroundColor: c.accent,
      paddingVertical: 14,
      alignItems: "center",
    },
    editButtonText: {
      color: c.onAccent,
      fontSize: 15,
      fontWeight: "700",
    },
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["left", "right"]}>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accentText} />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    const message =
      error === "blocked"
        ? t("social.profile.blocked")
        : error === "unknown"
          ? t("social.profile.unknownError")
          : t("social.profile.notFound");

    return (
      <SafeAreaView style={styles.container} edges={["left", "right"]}>
        <ErrorState message={message} showContactButton={false} />
      </SafeAreaView>
    );
  }

  const isOwner = profile.uid === currentUid;

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <PublicProfileHeader
          profile={profile}
          {...(isOwner ? { onEdit: () => navigation.navigate("EditProfile") } : {})}
        />

        <PublicLinksCard links={profile.links} privacy={profile.privacy} />

        {!isOwner && currentUid && (
          <View style={styles.actionRow}>
            {relation === "none" && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() =>
                  runSocialAction(
                    () => sendFriendRequest(profile.uid),
                    t("social.actions.addFriend"),
                  )
                }
              >
                <CustomText style={styles.actionButtonText}>
                  {t("social.actions.addFriend")}
                </CustomText>
              </TouchableOpacity>
            )}
            {relation === "sent" && (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() =>
                  runSocialAction(
                    () => cancelFriendRequest(profile.uid),
                    t("social.requests.cancel"),
                  )
                }
              >
                <CustomText style={styles.secondaryButtonText}>
                  {t("social.requests.cancel")}
                </CustomText>
              </TouchableOpacity>
            )}
            {relation === "received" && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() =>
                  runSocialAction(
                    () => respondFriendRequest(profile.uid, "accept"),
                    t("social.requests.accept"),
                  )
                }
              >
                <CustomText style={styles.actionButtonText}>
                  {t("social.requests.accept")}
                </CustomText>
              </TouchableOpacity>
            )}
            {relation === "friends" && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={async () => {
                  try {
                    const conversationId = await getOrCreateDirectConversation(profile.uid);
                    navigation.getParent()?.navigate("Social", {
                      screen: "ChatScreen",
                      params: { conversationId },
                    });
                  } catch {
                    Alert.alert(t("social.errors.chat"));
                  }
                }}
              >
                <CustomText style={styles.actionButtonText}>
                  {t("social.actions.message")}
                </CustomText>
              </TouchableOpacity>
            )}
            {relation === "blocked" ? (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() =>
                  runSocialAction(
                    () => unblockUser(profile.uid),
                    t("social.actions.unblock"),
                  )
                }
              >
                <CustomText style={styles.secondaryButtonText}>
                  {t("social.actions.unblock")}
                </CustomText>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.dangerButton}
                onPress={() =>
                  runSocialAction(() => blockUser(profile.uid), t("social.actions.block"))
                }
              >
                <CustomText style={styles.actionButtonText}>
                  {t("social.actions.block")}
                </CustomText>
              </TouchableOpacity>
            )}
          </View>
        )}

        {isOwner && (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate("EditProfile")}
          >
            <CustomText style={styles.editButtonText}>
              {t("settings.profileShowcase.editProfile")}
            </CustomText>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export default UserProfileScreen;
