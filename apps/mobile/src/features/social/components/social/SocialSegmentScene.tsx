import React, { useCallback, useMemo } from "react";
import { RefreshControl, View } from "react-native";
import { MessageSquare, Plus, SearchX, Share2, UserPlus, Users } from "lucide-react-native";
import { FlashList } from "@shopify/flash-list";
import { useTranslation } from "react-i18next";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import GamingEmptyState from "../GamingEmptyState";
import PlaySessionCard from "../PlaySessionCard";
import SocialFab from "./SocialFab";
import SocialListHeader from "./SocialListHeader";
import SocialPersonRow from "./SocialPersonRow";
import type { PlaySession } from "../../hooks/usePlaySessions";
import type { SocialScreenState } from "../../hooks/useSocialScreen";
import { useSocialPresence } from "../../hooks/useSocialPresence";
import {
  respondFriendRequest,
  cancelFriendRequest,
  sendFriendRequest,
} from "../../lib/friendService";
import type { SocialListRow } from "../../types";
import type { SocialSegment } from "../../lib/socialList";

type SocialSegmentSceneProps = {
  segment: SocialSegment;
  screen: SocialScreenState;
};

/** One lazy TabView scene: the segment's header content + its list rows. */
export default function SocialSegmentScene({
  segment,
  screen,
}: SocialSegmentSceneProps): React.ReactElement {
  const { t, i18n } = useTranslation();
  const colors = useThemeColors();

  // Presence (heartbeats → `users/{uid}.presence.updatedAt`) — only subscribed
  // while the friends scene is actually mounted (TabView lazy scenes), and only
  // for the friendship peer uids. The hook caps itself at 90 friends / 3 chunks.
  const friendUids = useMemo(() => {
    if (segment !== "friends") return [];
    const uids: string[] = [];
    for (const friendship of screen.friendships) {
      for (const member of friendship.members) {
        if (member !== screen.uid) uids.push(member);
      }
    }
    return uids;
  }, [segment, screen.friendships, screen.uid]);
  const presenceByUid = useSocialPresence(friendUids);

  const styles = useThemeStyles((c) => ({
    scene: { flex: 1, backgroundColor: c.background },
    content: { padding: 16, paddingBottom: 80 },
  }));

  const handleRespond = useCallback(
    (targetUid: string, action: "accept" | "decline") =>
      screen.handleFriendAction(
        () => respondFriendRequest(targetUid, action),
        t("social.requests.accepted"),
        t("social.errors.friendRequest"),
      ),
    [screen, t],
  );

  const handleCancelRequest = useCallback(
    (targetUid: string) =>
      screen.handleFriendAction(
        () => cancelFriendRequest(targetUid),
        t("social.requests.cancelled"),
        t("social.errors.friendRequest"),
      ),
    [screen, t],
  );

  const handleSendRequest = useCallback(
    (targetUid: string) =>
      screen.handleFriendAction(
        () => sendFriendRequest(targetUid),
        t("social.requests.sent"),
        t("social.errors.friendRequest"),
      ),
    [screen, t],
  );

  const renderItem = useCallback(
    ({ item }: { item: SocialListRow }) =>
      "gameName" in item ? (
        <PlaySessionCard
          session={item as PlaySession}
          currentUid={screen.currentUid}
          variant="social"
          participantProfiles={screen.friendProfiles}
          onSchedule={screen.handleSchedule}
          onOpenChat={(sessionItem: PlaySession) =>
            screen.openChat(sessionItem.conversationId)
          }
          onError={screen.handleSessionError}
        />
      ) : (
        <SocialPersonRow
          item={item}
          isSearching={screen.isSearching}
          uid={screen.uid}
          friendProfiles={screen.friendProfiles}
          relationByUid={screen.relationByUid}
          unreadCounts={screen.unreadCounts}
          presenceByUid={presenceByUid}
          i18nLang={i18n.language}
          onOpenProfile={screen.openProfile}
          onOpenChat={screen.openChat}
          onOpenDirectMessage={screen.openDirectMessage}
          onFriendMenu={(targetUid: string | null) =>
            targetUid && screen.setFriendMenuUid(targetUid)
          }
          onChatMenu={(conversationId: string | null) =>
            conversationId && screen.setChatMenuId(conversationId)
          }
          onRespond={handleRespond}
          onCancelRequest={handleCancelRequest}
          onSendRequest={handleSendRequest}
        />
      ),
    [screen, i18n.language, presenceByUid, handleRespond, handleCancelRequest, handleSendRequest],
  );

  const hasHandle = !!screen.myProfile?.handle;
  const fab = (() => {
    switch (segment) {
      case "friends":
        return {
          icon: <Plus size={24} color={colors.onAccent} />,
          label: t("social.groups.create"),
          onPress: () => screen.setGroupOpen(true),
          disabled: false,
          show: true,
        };
      case "requests":
        // Hidden during global search — mirrors the old share row behaviour.
        return {
          icon: <Share2 size={24} color={colors.onAccent} />,
          label: t("social.profile.share"),
          onPress: screen.shareProfile,
          disabled: screen.profileLoading || !hasHandle,
          show: !screen.isSearching,
        };
      case "chats":
        return {
          icon: <Plus size={24} color={colors.onAccent} />,
          label: t("social.chats.new"),
          onPress: () => screen.setNewChatOpen(true),
          disabled: false,
          show: true,
        };
      case "sessions":
        return {
          icon: <Plus size={24} color={colors.onAccent} />,
          label: t("social.sessions.new"),
          onPress: screen.openSessionForm,
          disabled: false,
          show: true,
        };
    }
  })();

  return (
    <View style={styles.scene}>
      <FlashList
        data={screen.rowsBySegment[segment] ?? []}
        keyExtractor={(item: SocialListRow) =>
          String("id" in item ? item.id : item.uid)
        }
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={screen.refreshing}
            onRefresh={screen.handleRefresh}
            tintColor={colors.accent}
          />
        }
        ListHeaderComponent={
          <SocialListHeader
            segment={segment}
            requestView={screen.requestView}
            chatView={screen.chatView}
            isSearching={screen.isSearching}
            query={screen.query}
            setQuery={screen.setQuery}
            searching={screen.searching}
            searchError={screen.searchError}
            platformFilter={screen.platformFilter}
            setPlatformFilter={screen.setPlatformFilter}
            countryFilter={screen.countryFilter}
            setCountryFilter={screen.setCountryFilter}
            countries={screen.countries}
            onRequestViewChange={screen.setRequestView}
            onChatViewChange={screen.setChatView}
          />
        }
        ListEmptyComponent={
          <GamingEmptyState
            title={
              screen.isSearching
                ? t("social.search.noResults")
                : t(`social.${segment}.empty`)
            }
            icon={
              screen.isSearching
                ? SearchX
                : segment === "friends"
                  ? Users
                  : segment === "requests"
                    ? UserPlus
                    : segment === "chats"
                      ? MessageSquare
                      : undefined
            }
            actionLabel={
              segment === "friends" ? t("social.groups.create") : undefined
            }
            onAction={segment === "friends" ? () => screen.setGroupOpen(true) : undefined}
          />
        }
        renderItem={renderItem}
      />
      {fab && fab.show && (
        <SocialFab icon={fab.icon} label={fab.label} onPress={fab.onPress} disabled={fab.disabled} />
      )}
    </View>
  );
}
