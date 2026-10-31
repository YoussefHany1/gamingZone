import React, { useCallback, useMemo } from "react";
import { ActivityIndicator, Alert, ScrollView, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MoreVertical } from "lucide-react-native";
import PressScale from "../components/PressScale";
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
import type { SettingsStackParamList } from "@/src/navigation/AppNavigator";
import { usePublicProfile } from "../hooks/usePublicProfile";
import { useProfileRelation } from "../hooks/useProfileRelation";
import PublicProfileHeader from "../components/PublicProfileHeader";
import PublicLinksCard from "../components/PublicLinksCard";
import ProfileActionBar from "../components/ProfileActionBar";

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
  const otherUid = profile?.uid ?? uid;
  const relation = useProfileRelation(currentUid, otherUid);

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
    heroGradient: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 18,
      minHeight: 110,
    },
    heroLabel: { color: c.onAccent, fontSize: 11, fontWeight: "800", letterSpacing: 1 },
    heroTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    heroBody: { padding: 12 },
    statRow: { flexDirection: "row", gap: 8, marginTop: 12 },
    stat: { flex: 1, padding: 10, borderRadius: 12, backgroundColor: c.accentSurface },
    statValue: { color: c.text, fontSize: 17, fontWeight: "900" },
    statLabel: { color: c.textMuted, fontSize: 11, marginTop: 2 },
    menuButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.surface,
    },

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
      <SafeAreaView style={styles.container}>
        <ErrorState message={message} showContactButton={false} />
      </SafeAreaView>
    );
  }

  const isOwner = profile.uid === currentUid;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroWrap}>
          <LinearGradient
            colors={[colors.backgroundDeep, colors.accent]}
            style={styles.heroGradient}
          >
            <View style={styles.heroTop}>
              <CustomText style={styles.heroLabel}>
                {isOwner
                  ? t("social.profile.yourProfile")
                  : t("social.profile.gamerProfile")}
              </CustomText>
              {!isOwner ? (
                <PressScale
                  style={styles.menuButton}
                  onPress={() => Alert.alert(t("social.actions.more"))}
                >
                  <MoreVertical size={18} color={colors.textMuted} />
                </PressScale>
              ) : null}
            </View>
          </LinearGradient>
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
