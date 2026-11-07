import React, { useCallback, useEffect, useMemo } from "react";
import { Alert, ScrollView, View } from "react-native";
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
import PressScale from "@/src/components/PressScale";
import SkeletonUserProfile from "../skeleton/SkeletonUserProfile";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useAuthStore } from "@/src/store/useAuthStore";
import type { SettingsStackParamList } from "@/src/navigation/AppNavigator";
import { usePublicProfile } from "../hooks/usePublicProfile";
import { useProfileRelation } from "../hooks/useProfileRelation";
import PublicProfileHeader from "../components/PublicProfileHeader";
import PublicLinksCard from "../components/PublicLinksCard";
import LibraryGrid from "../components/LibraryGrid";
import ProfileActionBar from "../components/ProfileActionBar";

function UserProfileScreen(): React.ReactElement {
  const { t } = useTranslation();
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
  const otherUid = profile?.uid ?? uid;
  const relation = useProfileRelation(currentUid, otherUid);

  // The native stack header shows the viewed profile's name (falls back to the
  // localized section title until the profile resolves).
  useEffect(() => {
    if (!profile) return;
    navigation.setOptions({ title: profile.displayName });
  }, [navigation, profile]);

  const styles = useThemeStyles((c) => ({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: 16, paddingBottom: 60 },
    heroWrap: {
      borderRadius: 22,
      overflow: "hidden",
      marginBottom: 18,
      borderWidth: 1,
      borderColor: c.accentBorder,
      backgroundColor: c.surface,
    },
    heroBody: { padding: 12 },
    statRow: { flexDirection: "row", gap: 8, marginTop: 12 },
    stat: { flex: 1, padding: 10, borderRadius: 12, backgroundColor: c.accentSurface },
    statValue: { color: c.text, fontSize: 17, fontWeight: "900" },
    statLabel: { color: c.textMuted, fontSize: 11, marginTop: 2 },
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
  }));

  const openDirectMessage = useCallback(async (): Promise<void> => {
    if (!profile) return;
    try {
      const conversationId = await getOrCreateDirectConversation(profile.uid);
      navigation.getParent()?.navigate("Social", {
        screen: "ChatScreen",
        params: { conversationId },
      });
    } catch {
      Alert.alert(t("social.errors.chat"));
    }
  }, [navigation, profile, t]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <SkeletonUserProfile />
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
      <SafeAreaView style={styles.container}>
        <ErrorState message={message} showContactButton={false} />
      </SafeAreaView>
    );
  }

  const isOwner = profile.uid === currentUid;

  return (
    <SafeAreaView style={styles.container} edges={["bottom", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroWrap}>
          <View style={styles.heroBody}>
            <PublicProfileHeader
              profile={profile}
              {...(isOwner ? { onEdit: () => navigation.navigate("EditProfile") } : {})}
            />
            <View style={styles.statRow}>
              <View style={styles.stat}>
                <CustomText style={styles.statValue}>{profile.counts.friends}</CustomText>
                <CustomText style={styles.statLabel}>
                  {t("social.profile.stats.friends")}
                </CustomText>
              </View>
              <View style={styles.stat}>
                <CustomText style={styles.statValue}>
                  {profile.counts.sessions}
                </CustomText>
                <CustomText style={styles.statLabel}>
                  {t("social.profile.stats.sessions")}
                </CustomText>
              </View>
            </View>
          </View>
        </View>

        <PublicLinksCard links={profile.links} privacy={profile.privacy} />

        <LibraryGrid profile={profile} isOwner={isOwner} />

        {!isOwner && currentUid && (
          <ProfileActionBar
            relation={relation}
            onAddFriend={() => sendFriendRequest(profile.uid)}
            onCancelRequest={() => cancelFriendRequest(profile.uid)}
            onAcceptRequest={() => respondFriendRequest(profile.uid, "accept")}
            onMessage={openDirectMessage}
            onBlock={() => blockUser(profile.uid)}
            onUnblock={() => unblockUser(profile.uid)}
          />
        )}

        {isOwner && (
          <PressScale
            style={styles.editButton}
            onPress={() => navigation.navigate("EditProfile")}
          >
            <CustomText style={styles.editButtonText}>
              {t("settings.profileShowcase.editProfile")}
            </CustomText>
          </PressScale>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export default UserProfileScreen;
