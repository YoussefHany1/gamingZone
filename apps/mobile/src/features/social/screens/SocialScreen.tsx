import React, { useCallback, useMemo } from "react";
import { TouchableOpacity, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TabView } from "react-native-tab-view";
import type { NavigationState, SceneRendererProps } from "react-native-tab-view";
import type { NavigationProp } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import { useAuthUser } from "@/src/hooks/useAuthUser";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import GroupCreateSheet from "../components/GroupCreateSheet";
import GroupSettingsSheet from "../components/social/GroupSettingsSheet";
import NewChatSheet from "../components/social/NewChatSheet";
import ChatMenuSheet from "../components/social/ChatMenuSheet";
import FriendMenuSheet from "../components/social/FriendMenuSheet";
import SessionFormSheet from "../components/social/SessionFormSheet";
import SocialSegmentScene from "../components/social/SocialSegmentScene";
import SocialTabBar from "../components/social/SocialTabBar";
import { useSocialScreen } from "../hooks/useSocialScreen";
import { useSocialTabs } from "../hooks/useSocialTabs";
import type { SocialRouteShape } from "../types";

/** Social tab: one lazy scene per segment, sharing the social data hook. */
function SocialScreen(): React.ReactElement {
  const { t } = useTranslation();
  const { user, isAnonymous } = useAuthUser();
  const navigation = useNavigation<NavigationProp<Record<string, object | undefined>>>();
  const layout = useWindowDimensions();
  const styles = useThemeStyles((c) => ({
    container: { flex: 1, backgroundColor: c.backgroundDeep, paddingVertical: 8 },
    loginContainer: {
      flex: 1,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      paddingHorizontal: 32,
      backgroundColor: c.backgroundDeep,
    },
    loginMessage: {
      color: c.text,
      fontSize: 16,
      textAlign: "center" as const,
      opacity: 0.8,
      lineHeight: 24,
      marginBottom: 20,
    },
    loginButton: {
      backgroundColor: c.accent,
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 24,
    },
    loginButtonText: {
      color: c.onAccent,
      fontSize: 15,
      fontWeight: "600" as const,
    },
  }));

  const screen = useSocialScreen();
  const { index, routes, handleIndexChange } = useSocialTabs({
    segment: screen.segment,
    onSegmentChange: screen.setSegment,
  });

  const navigationState: NavigationState<SocialRouteShape> = useMemo(
    () => ({ index, routes }),
    [index, routes],
  );
  const initialLayout = useMemo(() => ({ width: layout.width }), [layout.width]);

  /** Stable tab-bar renderer — prevents TabView from re-rendering the bar. */
  const renderTabBar = useCallback(
    (
      props: SceneRendererProps & { navigationState: NavigationState<SocialRouteShape> },
    ) => <SocialTabBar {...props} counts={screen.counts} />,
    [screen.counts],
  );

  /** Recreated only when the shared social state changes. */
  const renderScene = useCallback(
    ({ route }: { route: SocialRouteShape }) => (
      <SocialSegmentScene segment={route.key} screen={screen} />
    ),
    [screen],
  );

  /** Cross-navigator hop to the auth stack (bubbles up to the root navigator). */
  const handleSignIn = useCallback(() => {
    navigation.navigate("Auth", { screen: "Login" });
  }, [navigation]);

  /** Social is behind the login wall: signed-out / anonymous users get a sign-in prompt. */
  if (isAnonymous || !user) {
    return (
      <SafeAreaView style={styles.loginContainer}>
        <CustomText style={styles.loginMessage}>
          {t("common.loginRequired")}
        </CustomText>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={handleSignIn}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t("common.authPrompt.signIn")}
        >
          <CustomText style={styles.loginButtonText}>
            {t("common.authPrompt.signIn")}
          </CustomText>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <>
      <SessionFormSheet
        sessionForm={screen.sessionForm}
        conversations={screen.conversations}
        friendProfiles={screen.friendProfiles}
        uid={screen.uid}
        sessionBusy={screen.sessionBusy}
        onChange={screen.setSessionForm}
        onSubmit={screen.submitSession}
        onClose={screen.closeSessionForm}
      />

      <GroupCreateSheet
        visible={screen.groupOpen}
        onClose={() => screen.setGroupOpen(false)}
        friends={screen.groupFriends}
        onCreate={screen.createGroup}
      />

      <NewChatSheet
        visible={screen.newChatOpen}
        friends={screen.groupFriends}
        busy={screen.newChatBusy}
        onClose={() => screen.setNewChatOpen(false)}
        onStart={screen.startNewChat}
      />

      <GroupSettingsSheet
        conversation={screen.groupSettingsConversation}
        uid={screen.uid}
        friends={screen.groupFriends}
        busy={screen.groupSettingsBusy}
        onClose={() => screen.setGroupSettingsId(null)}
        onRename={screen.renameGroup}
        onRemoveMember={(conversationId, memberUid) =>
          screen.changeGroupMembers(conversationId, [memberUid], "remove")
        }
        onAddMember={(conversationId, memberUid) =>
          screen.changeGroupMembers(conversationId, [memberUid], "add")
        }
      />

      <ChatMenuSheet
        conversation={screen.chatMenuConversation}
        state={screen.chatMenuState}
        busy={screen.chatActionBusy}
        uid={screen.uid}
        onClose={() => screen.setChatMenuId(null)}
        onToggleMuted={screen.toggleChatMuted}
        onToggleArchived={screen.toggleChatArchived}
        onLeaveGroup={screen.leaveChatGroup}
        onDelete={screen.deleteChat}
        onOpenSettings={screen.openGroupSettings}
      />

      <FriendMenuSheet
        uid={screen.friendMenuUid}
        displayName={
          screen.friendProfiles[screen.friendMenuUid ?? ""]?.displayName ?? "Player"
        }
        inviting={screen.invitingToSession}
        onClose={() => screen.setFriendMenuUid(null)}
        onViewProfile={screen.openProfile}
        onInvite={screen.inviteToSession}
        onRemove={screen.confirmRemoveFriend}
        onBlock={screen.confirmBlockUser}
      />

      <SafeAreaView style={styles.container}>
        <TabView
          navigationState={navigationState}
          renderScene={renderScene}
          onIndexChange={handleIndexChange}
          lazy
          initialLayout={initialLayout}
          renderTabBar={renderTabBar}
        />
      </SafeAreaView>
    </>
  );
}

export default SocialScreen;
