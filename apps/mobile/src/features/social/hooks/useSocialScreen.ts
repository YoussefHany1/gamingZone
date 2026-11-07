import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Platform, Share } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp } from "@react-navigation/native";
import { profilePath, type Conversation } from "@gaming-zone/core";
import type { SocialStackParamList } from "@/src/navigation/AppNavigator";
import { useAuthStore } from "@/src/store/useAuthStore";
import { showToast } from "@/src/lib/toast";
import { useTranslation } from "react-i18next";
import { useSocialData } from "./useSocialData";
import { useMyProfile } from "./useMyProfile";
import { useProfileSearch } from "./useProfileSearch";
import { usePlaySessions, type PlaySession } from "./usePlaySessions";
import { useChatMenu, fallbackConversation } from "./useChatMenu";
import type { SessionActionErrorHandler } from "./useSessionActions";
import {
  blockUser,
  createGroupConversation,
  getOrCreateDirectConversation,
  removeFriend,
} from "../lib/friendService";
import { createPlaySession, proposeSlot } from "../lib/sessionService";
import { validateSessionUrl } from "../lib/sessionLink";
import { setGroupMembers, updateGroupConversation } from "../lib/friendService";
import { setConversationArchived } from "../lib/chatService";
import { showConfirmAlert } from "../lib/confirmDialog";
import {
  countryOptions,
  relationByUid as buildRelationByUid,
  selectSocialRows,
  socialTabCounts,
  toGroupFriends,
  visibleConversations as selectVisibleConversations,
  type ChatView,
  type RequestView,
  type SocialSegment,
} from "../lib/socialList";
import type { SocialRowsBySegment } from "../types";

type SocialParentNavigation = {
  Settings:
    | { screen: "UserProfile"; params: { uid: string } }
    | { screen: "BlockedUsersScreen" };
};

export type SessionFormState = {
  conversationId: string;
  gameName: string;
  gameId: string | number;
  startsAt: Date;
  /** Optional party-room link attached at creation time. */
  linkLabel: string;
  linkUrl: string;
  sessionId?: string;
};

const HOUR_MS = 60 * 60 * 1000;

export function useSocialScreen() {
  const { t } = useTranslation();
  const currentUid = useAuthStore((state) => state.user?.uid ?? "");
  const sessions = usePlaySessions(currentUid);
  const navigation =
    useNavigation<NavigationProp<SocialStackParamList & SocialParentNavigation>>();

  const [segment, setSegment] = useState<SocialSegment>("chats");
  const [requestView, setRequestView] = useState<RequestView>("incoming");
  const [chatView, setChatView] = useState<ChatView>("active");
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newChatBusy, setNewChatBusy] = useState(false);
  const [friendMenuUid, setFriendMenuUid] = useState<string | null>(null);
  const [invitingToSession, setInvitingToSession] = useState(false);
  const [platformFilter, setPlatformFilter] = useState<string | null>(null);
  const [countryFilter, setCountryFilter] = useState<string | null>(null);
  const [groupOpen, setGroupOpen] = useState(false);
  const [groupSettingsId, setGroupSettingsId] = useState<string | null>(null);
  const [groupSettingsBusy, setGroupSettingsBusy] = useState(false);
  const [sessionBusy, setSessionBusy] = useState(false);
  const [sessionForm, setSessionForm] = useState<SessionFormState | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const {
    uid,
    friendships,
    friendProfiles,
    requests,
    sentRequests,
    conversations,
    unreadCounts,
    conversationSettings,
    loading,
  } = useSocialData();
  const { profile: myProfile, loading: profileLoading } = useMyProfile(uid);
  const {
    query: globalSearchQuery,
    setQuery: setGlobalSearchQuery,
    results,
    searching,
    error: searchError,
    active: isSearching,
    refresh: refreshSearch,
    clear: clearSearch,
  } = useProfileSearch();

  // The friends search is local: it only filters the friends list and must
  // never trigger the global player search, which is scoped to the requests
  // tab. Chats and sessions have no search bar at all.
  const [friendsQuery, setFriendsQuery] = useState("");
  const query = segment === "friends" ? friendsQuery : globalSearchQuery;
  const setQuery = segment === "friends" ? setFriendsQuery : setGlobalSearchQuery;

  // Switching away from requests abandons the global search — otherwise its
  // results would linger behind tabs that can no longer edit them.
  const lastSegmentRef = useRef(segment);
  useEffect(() => {
    if (lastSegmentRef.current === segment) return;
    lastSegmentRef.current = segment;
    if (segment !== "requests" && isSearching) clearSearch();
  }, [segment, isSearching, clearSearch]);

  const submitSession = useCallback(async () => {
    if (!sessionForm || sessionBusy) return;
    if (!sessionForm.conversationId) {
      Alert.alert(t("social.errors.chat"));
      return;
    }
    if (!sessionForm.gameName.trim()) {
      Alert.alert(t("social.sessions.selectGameFirst"));
      return;
    }
    // A typed link must be a valid https URL even before hitting the network
    // — the backend drops invalid rows, so a typo would otherwise silently
    // attach nothing. Existing-session proposals never carry links.
    let initialLink: { label: string | null; url: string } | null = null;
    if (sessionForm.linkUrl.trim() && !sessionForm.sessionId) {
      const url = validateSessionUrl(sessionForm.linkUrl);
      if (!url) {
        Alert.alert(t("social.sessions.links.invalidUrl"));
        return;
      }
      initialLink = { label: sessionForm.linkLabel.trim() || null, url };
    }
    setSessionBusy(true);
    try {
      let id =
        sessionForm.sessionId ??
        sessions.find(
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
            ...(initialLink ? { links: [initialLink] } : {}),
          })
        ).sessionId;
      }
      await proposeSlot(id, sessionForm.startsAt.getTime());
      setSessionForm(null);
      showToast(t("social.sessions.scheduled"));
    } catch (error) {
      console.warn("submitSession failed", error);
      Alert.alert(t("social.sessions.actionFailed"));
    } finally {
      setSessionBusy(false);
    }
  }, [sessionBusy, sessionForm, sessions, t]);

  const createGroup = useCallback(
    async (title: string, memberUids: string[]): Promise<void> => {
      const conversationId = await createGroupConversation(title, memberUids);
      navigation.navigate("ChatScreen", { conversationId });
    },
    [navigation],
  );

  const visibleConversations = useMemo(
    () => selectVisibleConversations(conversations, conversationSettings, chatView),
    [chatView, conversationSettings, conversations],
  );

  const rowsBySegment = useMemo<SocialRowsBySegment>(() => {
    // Global search results only ever render in the requests scene; every
    // other segment always shows its own list. The friends scene filters by
    // its local query instead.
    const build = (segment: SocialSegment) =>
      selectSocialRows({
        isSearching: segment === "requests" && isSearching,
        results,
        platformFilter,
        countryFilter,
        segment,
        query: segment === "friends" ? friendsQuery : "",
        friendships,
        friendProfiles,
        uid,
        requestView,
        sentRequests,
        requests,
        visibleConversations,
      });
    // Every scene needs its own segment slice. The sessions scene always shows
    // session cards — global search results only ever render in the requests
    // scene (matching the search bar being scoped to that tab).
    const base = {
      friends: build("friends"),
      requests: build("requests"),
      chats: build("chats"),
    } as SocialRowsBySegment;
    base.sessions = [...sessions].sort((a, b) => {
      // Latest first: confirmed sessions by their start time, proposed ones
      // (no startsAt yet) sink to the bottom.
      const aTime = typeof a.startsAt === "number" ? a.startsAt : 0;
      const bTime = typeof b.startsAt === "number" ? b.startsAt : 0;
      return bTime - aTime;
    });
    return base;
  }, [
    countryFilter,
    friendsQuery,
    friendProfiles,
    friendships,
    isSearching,
    platformFilter,
    requestView,
    requests,
    results,
    sentRequests,
    sessions,
    uid,
    visibleConversations,
  ]);

  const counts = useMemo(
    () =>
      socialTabCounts({
        friendships,
        requests,
        unreadCounts,
        sessionsLength: sessions.length,
      }),
    [friendships, requests, sessions.length, unreadCounts],
  );

  const countries = useMemo(() => countryOptions(results), [results]);

  const groupFriends = useMemo(
    () => toGroupFriends(friendships, friendProfiles, uid),
    [friendProfiles, friendships, uid],
  );

  const relationByUid = useMemo(
    () => buildRelationByUid(friendships, requests, sentRequests, uid),
    [friendships, requests, sentRequests, uid],
  );

  const openProfile = useCallback(
    (targetUid?: string) => {
      if (targetUid)
        navigation.navigate("UserProfile", {
          uid: targetUid,
        });
    },
    [navigation],
  );

  const openChat = useCallback(
    (conversationId: string) => {
      navigation.navigate("ChatScreen", { conversationId });
    },
    [navigation],
  );

  useEffect(() => {
    conversations.forEach((conversation) => {
      const state = conversationSettings[conversation.id];
      if (!state?.archived) return;
      const lastRead = state.lastReadAt ?? 0;
      if (conversation.lastMessageAt && conversation.lastMessageAt > lastRead) {
        void setConversationArchived(conversation.id, uid, false);
      }
    });
  }, [conversations, conversationSettings, uid]);

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
      startsAt: new Date(Date.now() + HOUR_MS),
      linkLabel: "",
      linkUrl: "",
      sessionId: session.id,
    });
  }, []);

  const openDirectMessage = useCallback(
    async (targetUid: string) => {
      try {
        const conversationId = await getOrCreateDirectConversation(targetUid);
        navigation.navigate("ChatScreen", { conversationId });
      } catch {
        showToast(t("social.errors.chat"));
      }
    },
    [navigation, t],
  );

  const openBlockedUsers = useCallback(() => {
    navigation.getParent()?.navigate("Settings", { screen: "BlockedUsersScreen" });
  }, [navigation]);

  const shareProfile = useCallback(async () => {
    const handle = myProfile?.handle;
    const shareUrl = handle
      ? `https://gz1.games${profilePath(handle)}`
      : `gaming-zone://profile/${uid}`;
    const shareMessage = handle
      ? t("social.profile.shareMessage", { handle, url: shareUrl })
      : t("social.profile.shareMessageNoHandle", {
          name: myProfile?.displayName ?? "Player",
        });
    try {
      await Share.share(
        Platform.select({
          ios: { message: shareMessage, url: shareUrl },
          default: { message: `${shareMessage} ${shareUrl}` },
        })!,
        { dialogTitle: t("social.profile.shareTitle") },
      );
    } catch {
      showToast(t("social.errors.chat"));
    }
  }, [myProfile, t, uid]);

  const startNewChat = useCallback(
    async (targetUid: string) => {
      setNewChatBusy(true);
      try {
        const conversationId = await getOrCreateDirectConversation(targetUid);
        setNewChatOpen(false);
        navigation.navigate("ChatScreen", { conversationId });
      } catch {
        showToast(t("social.errors.chat"));
      } finally {
        setNewChatBusy(false);
      }
    },
    [navigation, t],
  );

  const confirmRemoveFriend = useCallback(
    (targetUid: string) => {
      showConfirmAlert({
        title: t("social.actions.removeFriend"),
        confirmLabel: t("common.save"),
        cancelLabel: t("common.cancel"),
        onConfirm: () => {
          void handleFriendAction(
            () => removeFriend(targetUid),
            t("social.actions.removeFriend"),
            t("social.errors.friendRequest"),
          );
          setFriendMenuUid(null);
        },
      });
    },
    [handleFriendAction, t],
  );

  const confirmBlockUser = useCallback(
    (targetUid: string) => {
      showConfirmAlert({
        title: t("social.actions.block"),
        confirmLabel: t("common.save"),
        cancelLabel: t("common.cancel"),
        onConfirm: () => {
          void handleFriendAction(
            () => blockUser(targetUid),
            t("social.actions.block"),
            t("social.errors.friendRequest"),
          );
          setFriendMenuUid(null);
        },
      });
    },
    [handleFriendAction, t],
  );

  const inviteToSession = useCallback(
    async (targetUid: string) => {
      setInvitingToSession(true);
      try {
        const conversationId = await getOrCreateDirectConversation(targetUid);
        setSessionForm({
          conversationId,
          gameName: "",
          gameId: "",
          startsAt: new Date(Date.now() + HOUR_MS),
          linkLabel: "",
          linkUrl: "",
        });
        setSegment("sessions");
        setFriendMenuUid(null);
      } catch {
        showToast(t("social.errors.chat"));
      } finally {
        setInvitingToSession(false);
      }
    },
    [t],
  );

  const openSessionForm = useCallback(() => {
    setSessionForm({
      conversationId: conversations[0]?.id ?? "",
      gameName: "",
      gameId: "",
      startsAt: new Date(Date.now() + HOUR_MS),
      linkLabel: "",
      linkUrl: "",
    });
  }, [conversations]);
  const closeSessionForm = useCallback(() => setSessionForm(null), []);

  // Chat-menu sheet state (shared with the chat screen via `useChatMenu`):
  // open id, conversation resolution, viewer state and the menu actions.
  const resolveChatMenuConversation = useCallback(
    (conversationId: string): Conversation =>
      conversations.find((item) => item.id === conversationId) ??
      fallbackConversation(conversationId),
    [conversations],
  );
  const chatMenu = useChatMenu({
    uid,
    resolveConversation: resolveChatMenuConversation,
    userStates: conversationSettings,
  });

  const openGroupSettings = useCallback(
    (conversationId: string) => {
      chatMenu.closeMenu();
      setGroupSettingsId(conversationId);
    },
    [chatMenu],
  );

  const groupSettingsConversation = useMemo(() => {
    if (!groupSettingsId) return null;
    return conversations.find((item) => item.id === groupSettingsId) ?? null;
  }, [conversations, groupSettingsId]);

  const renameGroup = useCallback(
    (conversationId: string, title: string) => {
      if (!title.trim()) return;
      setGroupSettingsBusy(true);
      void updateGroupConversation(conversationId, { title })
        .then(() => showToast(t("social.groups.renameSuccess")))
        .catch(() => showToast(t("social.groups.error")))
        .finally(() => setGroupSettingsBusy(false));
    },
    [t],
  );

  const changeGroupMembers = useCallback(
    (conversationId: string, memberUids: string[], action: "add" | "remove") => {
      setGroupSettingsBusy(true);
      void setGroupMembers(conversationId, memberUids, action)
        .then(() => showToast(t("social.groups.renameSuccess")))
        .catch(() => showToast(t("social.groups.error")))
        .finally(() => setGroupSettingsBusy(false));
    },
    [t],
  );

  return {
    uid,
    currentUid,
    sessions,
    segment,
    setSegment,
    requestView,
    setRequestView,
    chatView,
    setChatView,
    // First-load gate for the social skeletons.
    loading,
    chatMenuConversation: chatMenu.conversation,
    chatMenuState: chatMenu.state,
    setChatMenuId: (conversationId: string | null) => {
      if (conversationId) chatMenu.openMenu(conversationId);
      else chatMenu.closeMenu();
    },
    chatActionBusy: chatMenu.busy,
    newChatOpen,
    setNewChatOpen,
    newChatBusy,
    friendMenuUid,
    setFriendMenuUid,
    invitingToSession,
    platformFilter,
    setPlatformFilter,
    countryFilter,
    setCountryFilter,
    countries,
    groupOpen,
    setGroupOpen,
    groupSettingsConversation,
    groupSettingsBusy,
    setGroupSettingsId,
    openGroupSettings,
    renameGroup,
    changeGroupMembers,
    sessionBusy,
    sessionForm,
    setSessionForm,
    refreshing,
    friendships,
    friendProfiles,
    conversations,
    unreadCounts,
    conversationSettings,
    myProfile,
    profileLoading,
    query,
    setQuery,
    results,
    searching,
    searchError,
    isSearching,
    submitSession,
    createGroup,
    counts,
    groupFriends,
    relationByUid,
    openProfile,
    openChat,
    handleRefresh,
    handleFriendAction,
    handleSessionError,
    handleSchedule,
    openDirectMessage,
    openBlockedUsers,
    shareProfile,
    startNewChat,
    confirmRemoveFriend,
    confirmBlockUser,
    inviteToSession,
    openSessionForm,
    closeSessionForm,
    toggleChatMuted: chatMenu.toggleMuted,
    toggleChatArchived: chatMenu.toggleArchived,
    leaveChatGroup: chatMenu.leaveGroup,
    deleteChat: chatMenu.delete,
    rowsBySegment,
  };
}

export type SocialScreenState = ReturnType<typeof useSocialScreen>;
