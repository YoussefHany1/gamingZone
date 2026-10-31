import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Platform, RefreshControl, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp } from "@react-navigation/native";
import type { SocialStackParamList } from "@/src/navigation/AppNavigator";
import { FlashList } from "@shopify/flash-list";
import { Check, Plus, Search, UserPlus, X } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import type {
  Conversation,
  FriendRequest,
  Friendship,
  ProfileSearchHit,
} from "@gaming-zone/core";
import CustomText from "@/src/components/CustomText";
import CustomTextInput from "@/src/components/CustomTextInput";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useAuthStore } from "@/src/store/useAuthStore";
import { useSocialData } from "../hooks/useSocialData";
import { useProfileSearch } from "../hooks/useProfileSearch";
import { showToast } from "@/src/lib/toast";
import {
  createGroupConversation,
  respondFriendRequest,
  sendFriendRequest,
} from "../lib/friendService";
import { usePlaySessions, type PlaySession } from "../hooks/usePlaySessions";
import { createPlaySession, proposeSlot } from "../lib/sessionService";
import PressScale from "../components/PressScale";
import GameBottomSheet from "../components/GameBottomSheet";
import GamingEmptyState from "../components/GamingEmptyState";
import SocialListRow from "../components/SocialListRow";
import PlaySessionCard from "../components/PlaySessionCard";
import GroupCreateSheet, { type GroupFriend } from "../components/GroupCreateSheet";
import { relativeTime } from "../lib/relativeTime";
import type { SessionActionErrorHandler } from "../hooks/useSessionActions";

type SocialParentNavigation = {
  Settings: { screen: "UserProfile"; params: { uid: string } };
};
type Segment = "friends" | "requests" | "chats" | "sessions";
const segments: Segment[] = ["friends", "requests", "chats", "sessions"];
type SocialListItem =
  PlaySession | ProfileSearchHit | FriendRequest | Friendship | Conversation;

export default function SocialScreen(): React.ReactElement {
  const { t, i18n } = useTranslation();
  const colors = useThemeColors();
  const currentUid = useAuthStore((state) => state.user?.uid ?? "");
  const sessions = usePlaySessions(currentUid);
  const navigation =
    useNavigation<NavigationProp<SocialStackParamList & SocialParentNavigation>>();
  const styles = useThemeStyles((c) => ({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: 16, paddingBottom: 80 },
    tabs: {
      flexDirection: "row",
      gap: 7,
      padding: 4,
      marginBottom: 14,
      borderRadius: 16,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    tab: {
      flex: 1,
      minHeight: 42,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 3,
    },
    activeTab: {
      backgroundColor: c.accent,
      shadowColor: c.accent,
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 3,
    },
    tabText: { color: c.textMuted, fontSize: 12, fontWeight: "700" },
    activeTabText: { color: c.onAccent },
    badge: {
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      paddingHorizontal: 5,
      marginTop: 3,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.accentSurface,
    },
    badgeActive: { backgroundColor: c.onAccent },
    badgeText: { color: c.accentText, fontSize: 10, fontWeight: "800" },
    badgeActiveText: { color: c.accent },
    search: {
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      minHeight: 50,
      paddingHorizontal: 14,
      marginBottom: 14,
      borderRadius: 16,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    input: { flex: 1, color: c.text, paddingVertical: 8, fontSize: 15 },
    action: {
      minHeight: 36,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
      paddingHorizontal: 12,
      borderRadius: 11,
      backgroundColor: c.accent,
    },
    dangerAction: { backgroundColor: c.danger },
    secondaryButton: {
      minHeight: 36,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 11,
      borderRadius: 11,
      backgroundColor: c.accentSurface,
      borderWidth: 1,
      borderColor: c.border,
    },
    secondaryButtonText: { color: c.text, fontSize: 12, fontWeight: "700" },
    actionText: { color: c.onAccent, fontSize: 12, fontWeight: "800" },
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
    searchError: { marginBottom: 12, color: c.danger },
    sheetTitle: { color: c.text, fontSize: 20, fontWeight: "900", marginBottom: 14 },
    muted: { color: c.textMuted, fontSize: 12, marginTop: 3 },
    sheetActions: { flexDirection: "row", gap: 10, marginTop: 6 },
    actionGrow: {
      flex: 1,
      minHeight: 40,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 11,
      backgroundColor: c.accent,
    },
    secondaryGrow: {
      flex: 1,
      minHeight: 40,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 11,
      backgroundColor: c.accentSurface,
      borderWidth: 1,
      borderColor: c.border,
    },
  }));

  const [segment, setSegment] = useState<Segment>("friends");
  const [groupOpen, setGroupOpen] = useState(false);
  const [sessionBusy, setSessionBusy] = useState(false);
  const [sessionForm, setSessionForm] = useState<{
    conversationId: string;
    gameName: string;
    gameId: string | number;
    startsAt: Date;
  } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { uid, friendships, friendProfiles, requests, conversations, unreadCounts } =
    useSocialData();
  const {
    query,
    setQuery,
    results,
    searching,
    error: searchError,
    active: isSearching,
    refresh: refreshSearch,
  } = useProfileSearch();

  const submitSession = async () => {
    if (!sessionForm || sessionBusy) return;
    setSessionBusy(true);
    try {
      let id = sessions.find(
        (session) =>
          session.conversationId === sessionForm.conversationId &&
          session.status === "proposed",
      )?.id;
      if (!id) {
        id = (
          await createPlaySession({
            conversationId: sessionForm.conversationId,
            gameId: sessionForm.gameId,
            gameName: sessionForm.gameName,
          })
        ).sessionId;
      }
      await proposeSlot(id, sessionForm.startsAt.getTime());
      setSessionForm(null);
      showToast(t("social.sessions.scheduled"));
    } catch {
      Alert.alert(t("social.errors.chat"));
    } finally {
      setSessionBusy(false);
    }
  };

  const createGroup = useCallback(
    async (title: string, memberUids: string[]): Promise<void> => {
      const conversationId = await createGroupConversation(title, memberUids);
      navigation.navigate("ChatScreen", { conversationId });
    },
    [navigation],
  );

  const rows = isSearching
    ? results
    : segment === "requests"
      ? requests
      : segment === "chats"
        ? conversations
        : friendships;
  const counts: Record<Segment, number> = {
    friends: friendships.length,
    requests: requests.length,
    chats: conversations.length,
    sessions: sessions.length,
  };

  const groupFriends = useMemo<GroupFriend[]>(
    () =>
      friendships.flatMap((friendship) => {
        const friendUid = friendship.members.find((member) => member !== uid);
        if (!friendUid) return [];
        const profile = friendProfiles[friendUid];
        return [
          {
            uid: friendUid,
            displayName: profile?.displayName ?? "Player",
            photoURL: profile?.photoURL ?? null,
          },
        ];
      }),
    [friendProfiles, friendships, uid],
  );

  const openProfile = useCallback(
    (targetUid?: string) => {
      if (targetUid)
        navigation
          .getParent()
          ?.navigate("Settings", { screen: "UserProfile", params: { uid: targetUid } });
    },
    [navigation],
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshSearch();
      showToast(t("social.messages.refreshed"));
    } catch {
      showToast(t("social.errors.refresh"));
    } finally {
      setRefreshing(false);
    }
  }, [refreshSearch, t]);

  const handleFriendAction = useCallback(
    async (action: () => Promise<unknown>, successMsg: string, errorMsg: string) => {
      try {
        await action();
        showToast(successMsg);
      } catch {
        showToast(errorMsg);
      }
    },
    [],
  );

  const handleSessionError = useCallback<SessionActionErrorHandler>(() => {
    showToast(t("social.sessions.actionFailed"));
  }, [t]);

  const handleSchedule = useCallback((session: PlaySession) => {
    setSessionForm({
      conversationId: session.conversationId,
      gameId: session.gameId,
      gameName: session.gameName,
      startsAt: new Date(Date.now() + 60 * 60 * 1000),
    });
  }, []);

  const renderItem = useCallback(
    ({
      item,
    }: {
      item: ProfileSearchHit | FriendRequest | Friendship | Conversation;
    }) => {
      const isConversation =
        "type" in item && (item.type === "dm" || item.type === "group");
      let label = "Player",
        subtitle = "",
        photoURL: string | null | undefined,
        targetUid: string | undefined;
      if (isSearching && "handle" in item) {
        label = `@${item.handle}`;
        subtitle = item.displayName;
        photoURL = item.photoURL;
        targetUid = item.uid;
      } else if ("from" in item) {
        const profile = friendProfiles[item.from];
        photoURL = profile?.photoURL;
        label = profile?.displayName ?? "Player";
        subtitle = profile?.handle ? `@${profile.handle}` : "";
        targetUid = item.from;
      } else if (isConversation) {
        if (item.type === "dm") {
          targetUid = item.members.find((member) => member !== uid);
          const profile = targetUid ? friendProfiles[targetUid] : undefined;
          photoURL = profile?.photoURL;
          label = profile?.displayName ?? "Player";
        } else {
          label = item.title ?? t("social.groups.fallback");
          subtitle = item.lastMessage?.text ?? t("social.chats.noMessages");
        }
      } else if ("members" in item) {
        targetUid = item.members.find((member) => member !== uid);
        const profile = targetUid ? friendProfiles[targetUid] : undefined;
        photoURL = profile?.photoURL;
        label = profile?.displayName ?? "Player";
        subtitle = profile?.handle ? `@${profile.handle}` : "";
      }
      const onRow = () =>
        isConversation
          ? navigation.navigate("ChatScreen", { conversationId: item.id })
          : openProfile(targetUid);
      const meta =
        isConversation && item.lastMessageAt
          ? relativeTime(item.lastMessageAt, i18n.language)
          : null;
      const unreadCount = isConversation ? (unreadCounts[item.id] ?? 0) : 0;

      const actions =
        isSearching && "uid" in item && targetUid !== uid ? (
          <PressScale
            style={styles.action}
            onPress={() =>
              handleFriendAction(
                () => sendFriendRequest(item.uid),
                t("social.requests.sent"),
                t("social.errors.friendRequest"),
              )
            }
          >
            <UserPlus size={16} color={colors.onAccent} />
          </PressScale>
        ) : !isSearching && "from" in item && !isConversation ? (
          <>
            <PressScale
              style={styles.action}
              onPress={() =>
                void handleFriendAction(
                  () => respondFriendRequest(item.from, "accept"),
                  t("social.requests.accepted"),
                  t("social.errors.friendRequest"),
                )
              }
            >
              <Check size={16} color={colors.onAccent} />
            </PressScale>
            <PressScale
              style={[styles.action, styles.dangerAction]}
              onPress={() =>
                void handleFriendAction(
                  () => respondFriendRequest(item.from, "decline"),
                  t("social.requests.declined"),
                  t("social.errors.friendRequest"),
                )
              }
            >
              <X size={16} color={colors.onAccent} />
            </PressScale>
          </>
        ) : null;

      return (
        <SocialListRow
          photoURL={photoURL}
          label={label}
          subtitle={subtitle}
          meta={meta}
          unreadCount={unreadCount}
          conversation={isConversation}
          onPress={onRow}
          disabled={!isConversation && !targetUid}
          trailing={actions}
        />
      );
    },
    [
      colors.onAccent,
      friendProfiles,
      handleFriendAction,
      i18n.language,
      isSearching,
      navigation,
      openProfile,
      styles.action,
      styles.dangerAction,
      t,
      uid,
      unreadCounts,
    ],
  );

  const listData = segment === "sessions" && !isSearching ? sessions : rows;
  const renderListItem = useCallback(
    ({ item }: { item: SocialListItem }) =>
      "gameName" in item ? (
        <PlaySessionCard
          session={item}
          currentUid={currentUid}
          variant="social"
          participantProfiles={friendProfiles}
          onSchedule={handleSchedule}
          onError={handleSessionError}
        />
      ) : (
        renderItem({ item })
      ),
    [currentUid, friendProfiles, handleSchedule, handleSessionError, renderItem],
  );

  return (
    <>
      <GameBottomSheet
        visible={sessionForm !== null}
        onClose={() => setSessionForm(null)}
      >
        <CustomText style={styles.sheetTitle}>{t("social.sessions.schedule")}</CustomText>
        <CustomText style={styles.muted}>{sessionForm?.gameName}</CustomText>
        {sessionForm && (
          <DateTimePicker
            value={sessionForm.startsAt}
            mode="datetime"
            minimumDate={new Date(Date.now() + 5 * 60 * 1000)}
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(_, date) => {
              if (date)
                setSessionForm((previous) =>
                  previous ? { ...previous, startsAt: date } : previous,
                );
            }}
          />
        )}
        <View style={styles.sheetActions}>
          <PressScale
            style={styles.actionGrow}
            onPress={() => void submitSession()}
            disabled={sessionBusy}
          >
            <CustomText style={styles.actionText}>
              {sessionBusy ? t("social.sessions.saving") : t("social.sessions.schedule")}
            </CustomText>
          </PressScale>
          <PressScale style={styles.secondaryGrow} onPress={() => setSessionForm(null)}>
            <CustomText style={styles.secondaryButtonText}>
              {t("social.sessions.cancel")}
            </CustomText>
          </PressScale>
        </View>
      </GameBottomSheet>

      <GroupCreateSheet
        visible={groupOpen}
        onClose={() => setGroupOpen(false)}
        friends={groupFriends}
        onCreate={createGroup}
      />

      <SafeAreaView style={styles.container}>
        <FlashList
          data={listData}
          keyExtractor={(item) => ("id" in item ? item.id : item.uid)}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.accent}
            />
          }
          ListHeaderComponent={
            <>
              <View style={styles.tabs}>
                {segments.map((value) => {
                  const active = segment === value;
                  return (
                    <PressScale
                      key={value}
                      style={[styles.tab, active && styles.activeTab]}
                      onPress={() => setSegment(value)}
                    >
                      <CustomText
                        style={[styles.tabText, active && styles.activeTabText]}
                      >
                        {t(`social.${value}.title`)}
                      </CustomText>
                      {counts[value] > 0 && value !== "friends" && (
                        <View style={[styles.badge, active && styles.badgeActive]}>
                          <CustomText
                            style={[styles.badgeText, active && styles.badgeActiveText]}
                          >
                            {counts[value]}
                          </CustomText>
                        </View>
                      )}
                    </PressScale>
                  );
                })}
              </View>
              {segment === "friends" && !isSearching && (
                <PressScale style={styles.groupCreate} onPress={() => setGroupOpen(true)}>
                  <Plus size={16} color={colors.onAccent} />
                  <CustomText style={styles.actionText}>
                    {t("social.groups.create")}
                  </CustomText>
                </PressScale>
              )}
              <View style={styles.search}>
                <Search size={18} color={colors.textMuted} />
                <CustomTextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder={t("social.search.placeholder")}
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                />
                {query.length > 0 && (
                  <PressScale onPress={() => setQuery("")}>
                    <X size={18} color={colors.textMuted} />
                  </PressScale>
                )}
                {searching && <ActivityIndicator color={colors.accent} />}
              </View>
              {searchError && (
                <CustomText style={styles.searchError}>
                  {t("social.errors.search")}
                </CustomText>
              )}
            </>
          }
          ListEmptyComponent={
            <GamingEmptyState
              title={
                isSearching ? t("social.search.noResults") : t(`social.${segment}.empty`)
              }
              actionLabel={segment === "friends" ? t("social.groups.create") : undefined}
              onAction={segment === "friends" ? () => setGroupOpen(true) : undefined}
            />
          }
          renderItem={renderListItem}
        />
      </SafeAreaView>
    </>
  );
}
