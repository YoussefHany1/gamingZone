import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Modal, Platform, RefreshControl, TouchableOpacity, View } from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
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
type SocialParentNavigation = {
  Settings: { screen: "UserProfile"; params: { uid: string } };
};
import CustomText from "@/src/components/CustomText";
import CustomTextInput from "@/src/components/CustomTextInput";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useAuthStore } from "@/src/store/useAuthStore";
import { useSocialData } from "../hooks/useSocialData";
import {
  createGroupConversation,
  respondFriendRequest,
  sendFriendRequest,
} from "../lib/friendService";
import { usePlaySessions } from "../hooks/usePlaySessions";
import {
  cancelSession,
  confirmSession,
  createPlaySession,
  leaveSession,
  proposeSlot,
  respondToSlot,
  withdrawProposal,
} from "../lib/sessionService";

export default function SocialScreen(): React.ReactElement {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const currentUid = useAuthStore((state) => state.user?.uid ?? "");
  const sessions = usePlaySessions(currentUid);
  const navigation =
    useNavigation<NavigationProp<SocialStackParamList & SocialParentNavigation>>();
  const styles = useThemeStyles((c) => ({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: 16, paddingBottom: 80 },
    tabs: { flexDirection: "row", gap: 8, marginBottom: 14 },
    tab: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: c.surface,
    },
    activeTab: { backgroundColor: c.accent },
    tabText: { color: c.textMuted, fontWeight: "600" },
    activeTabText: { color: c.onAccent },
    search: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: c.surface,
      borderRadius: 12,
      paddingHorizontal: 12,
      marginBottom: 14,
    },
    input: { flex: 1, color: c.text, paddingVertical: 12 },
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
    muted: { color: c.textMuted, fontSize: 13 },
    action: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: c.accent,
    },
    dangerAction: { backgroundColor: c.danger },
    secondaryButton: { backgroundColor: c.surface, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
    secondaryButtonText: { color: c.text, fontSize: 12 },
    empty: { alignItems: "center", paddingVertical: 48 },
    unreadBadge: {
      minWidth: 22,
      height: 22,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 6,
      backgroundColor: c.accent,
    },
    unreadText: { color: c.onAccent, fontSize: 12, fontWeight: "700" },
    searchError: { marginBottom: 12, color: c.danger },
    modalBackdrop: { flex: 1, justifyContent: "center", backgroundColor: "rgba(0,0,0,0.65)", padding: 20 },
    modal: { backgroundColor: c.surface, borderRadius: 16, padding: 18, gap: 12 },
    modalTitle: { color: c.text, fontSize: 18, fontWeight: "700" },
    selected: { backgroundColor: c.accent },
    selectedText: { color: c.onAccent },
  }));
  const [segment, setSegment] = useState<"friends" | "requests" | "chats" | "sessions">("friends");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [groupTitle, setGroupTitle] = useState("");
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [groupBusy, setGroupBusy] = useState(false);
  const [sessionBusy, setSessionBusy] = useState(false);
  const [sessionForm, setSessionForm] = useState<{ conversationId: string; gameName: string; gameId: string | number; startsAt: Date } | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const {
    uid,
    friendships,
    friendProfiles,
    requests,
    conversations,
    unreadCounts,
    results,
    search,
    searchError,
  } = useSocialData();

  const submitSession = async () => {
    if (!sessionForm || sessionBusy) return;
    setSessionBusy(true);
    try {
      let sessionId = sessions.find((session) => session.conversationId === sessionForm.conversationId && session.status === "proposed")?.id;
      if (!sessionId) {
        sessionId = (await createPlaySession({
          conversationId: sessionForm.conversationId,
          gameId: sessionForm.gameId,
          gameName: sessionForm.gameName,
        })).sessionId;
      }
      await proposeSlot(sessionId, sessionForm.startsAt.getTime());
      setSessionForm(null);
    } catch {
      Alert.alert(t("social.errors.chat"));
    } finally {
      setSessionBusy(false);
    }
  };

  const submitGroup = async () => {
    if (!groupTitle.trim() || selectedFriends.length === 0 || groupBusy) return;
    setGroupBusy(true);
    try {
      const conversationId = await createGroupConversation(groupTitle, selectedFriends);
      setGroupOpen(false);
      setGroupTitle("");
      setSelectedFriends([]);
      navigation.navigate("ChatScreen", { conversationId });
    } catch {
      Alert.alert(t("social.errors.chat"));
    } finally {
      setGroupBusy(false);
    }
  };

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (query.trim().replace(/^@+/, "").length < 2) return;
    debounce.current = setTimeout(async () => {
      setSearching(true);
      await search(query);
      setSearching(false);
    }, 300);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query, search]);

  const rows: Array<ProfileSearchHit | FriendRequest | Friendship | Conversation> =
    query.trim().length >= 2
      ? results
      : segment === "requests"
        ? requests
        : segment === "chats"
          ? conversations
          : friendships;

  const trimmedQuery = query.trim();
  const isSearching = trimmedQuery.length >= 2;
  const emptyText = isSearching
    ? t("social.search.noResults")
    : t(`social.${segment}.empty`);

  if (segment === "sessions" && !isSearching) {
    return (
      <SafeAreaView style={styles.container} edges={["left", "right"]}>
        <FlashList
          data={sessions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.content}
          ListHeaderComponent={
            <View style={styles.tabs}>
              {(["friends", "requests", "chats", "sessions"] as const).map((value) => (
                <TouchableOpacity key={value} style={[styles.tab, segment === value && styles.activeTab]} onPress={() => setSegment(value)}>
                  <CustomText style={[styles.tabText, segment === value && styles.activeTabText]}>{value}</CustomText>
                </TouchableOpacity>
              ))}
            </View>
          }
          ListEmptyComponent={<View style={styles.empty}><CustomText style={styles.muted}>No sessions yet</CustomText></View>}
          renderItem={({ item }) => {
            const proposal = item.proposals.find((candidate) => candidate.status !== "withdrawn");
            const accepted = proposal?.responses[currentUid] === "accepted";
            const everyoneAccepted = proposal && item.participantUids.every((participant) => proposal.responses[participant] === "accepted");
            return (
              <View style={styles.row}>
                <View style={styles.rowText}>
                  <CustomText style={styles.rowText}>{item.gameName}</CustomText>
                  {item.status === "proposed" ? <TouchableOpacity style={styles.action} onPress={() => setSessionForm({ conversationId: item.conversationId, gameId: item.gameId, gameName: item.gameName, startsAt: new Date(Date.now() + 60 * 60 * 1000) })}><CustomText style={{ color: colors.onAccent }}>New proposal</CustomText></TouchableOpacity> : null}
                  <CustomText style={styles.muted}>{item.status}{proposal ? ` • ${new Date(proposal.startsAt).toLocaleString()}` : ""}</CustomText>
                </View>
                {proposal && !accepted && item.status === "proposed" ? <TouchableOpacity style={styles.action} onPress={() => void respondToSlot(item.id, proposal.id, "accepted")}><CustomText style={{ color: colors.onAccent }}>Accept</CustomText></TouchableOpacity> : null}
                {proposal && accepted && item.status === "proposed" ? <TouchableOpacity style={styles.dangerAction} onPress={() => void respondToSlot(item.id, proposal.id, "declined")}><CustomText style={{ color: colors.onAccent }}>Decline</CustomText></TouchableOpacity> : null}
                {proposal && proposal.proposerUid === currentUid && item.status === "proposed" ? <TouchableOpacity style={styles.secondaryButton} onPress={() => void withdrawProposal(item.id, proposal.id)}><CustomText style={styles.secondaryButtonText}>Withdraw</CustomText></TouchableOpacity> : null}
                {proposal && everyoneAccepted && item.status === "proposed" ? <TouchableOpacity style={styles.action} onPress={() => void confirmSession(item.id, proposal.id)}><CustomText style={{ color: colors.onAccent }}>Confirm</CustomText></TouchableOpacity> : null}
                {item.status === "proposed" ? <TouchableOpacity style={styles.dangerAction} onPress={() => void cancelSession(item.id)}><CustomText style={{ color: colors.onAccent }}>Cancel</CustomText></TouchableOpacity> : null}
                {item.status !== "cancelled" ? <TouchableOpacity style={styles.secondaryButton} onPress={() => void leaveSession(item.id)}><CustomText style={styles.secondaryButtonText}>Leave</CustomText></TouchableOpacity> : null}
              </View>
            );
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <>
      <Modal visible={sessionForm !== null} transparent animationType="fade" onRequestClose={() => setSessionForm(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <CustomText style={styles.modalTitle}>Propose play time</CustomText>
            <CustomText style={styles.muted}>{sessionForm?.gameName}</CustomText>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setSessionForm((previous) => previous ? { ...previous, startsAt: new Date(previous.startsAt.getTime() + 30 * 60 * 1000) } : previous)}>
              <CustomText style={styles.secondaryButtonText}>{sessionForm?.startsAt.toLocaleString()}</CustomText>
            </TouchableOpacity>
            <DateTimePicker
              value={sessionForm?.startsAt ?? new Date(Date.now() + 60 * 60 * 1000)}
              mode="datetime"
              minimumDate={new Date(Date.now() + 5 * 60 * 1000)}
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={(_event: DateTimePickerEvent, selectedDate?: Date) => {
                if (selectedDate) setSessionForm((previous) => previous ? { ...previous, startsAt: selectedDate } : previous);
              }}
            />
            <TouchableOpacity style={styles.action} onPress={() => void submitSession()} disabled={sessionBusy}>
              <CustomText style={{ color: colors.onAccent }}>{sessionBusy ? "Saving…" : "Propose"}</CustomText>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setSessionForm(null)}><CustomText style={styles.muted}>Cancel</CustomText></TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal visible={groupOpen} transparent animationType="fade" onRequestClose={() => setGroupOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <CustomText style={styles.modalTitle}>Create group</CustomText>
            <CustomTextInput
              value={groupTitle}
              onChangeText={setGroupTitle}
              placeholder="Group name"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
            {friendships.map((friendship) => {
              const friendUid = friendship.members.find((member) => member !== uid);
              if (!friendUid) return null;
              const profile = friendProfiles[friendUid];
              const selected = selectedFriends.includes(friendUid);
              return (
                <TouchableOpacity
                  key={friendUid}
                  style={[styles.row, selected && styles.selected]}
                  onPress={() => setSelectedFriends((previous) => selected
                    ? previous.filter((item) => item !== friendUid)
                    : [...previous, friendUid])}
                >
                  <CustomText style={[styles.rowText, selected && styles.selectedText]}>
                    {profile?.displayName ?? "Player"}
                  </CustomText>
                  <CustomText style={[styles.muted, selected && styles.selectedText]}>
                    {selected ? "Selected" : "Select"}
                  </CustomText>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={styles.action} onPress={() => void submitGroup()} disabled={groupBusy}>
              <CustomText style={{ color: colors.onAccent }}>{groupBusy ? "Creating…" : "Create"}</CustomText>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setGroupOpen(false)}>
              <CustomText style={styles.muted}>Cancel</CustomText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <SafeAreaView style={styles.container}>
      <FlashList
        data={rows}
        keyExtractor={(item) => ("id" in item ? item.id : item.uid)}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => undefined}
            tintColor={colors.accent}
          />
        }
        ListHeaderComponent={
          <>
            <View style={styles.tabs}>
              {(["friends", "requests", "chats", "sessions"] as const).map((value) => (
                <TouchableOpacity
                  key={value}
                  style={[styles.tab, segment === value && styles.activeTab]}
                  onPress={() => setSegment(value)}
                >
                  <CustomText
                    style={[styles.tabText, segment === value && styles.activeTabText]}
                  >
                    {t(`social.${value}.title`)}
                  </CustomText>
                </TouchableOpacity>
              ))}
            </View>
            {segment === "friends" && !isSearching ? (
              <TouchableOpacity style={styles.action} onPress={() => setGroupOpen(true)}>
                <Plus size={16} color={colors.onAccent} />
                <CustomText style={{ color: colors.onAccent }}>Create group</CustomText>
              </TouchableOpacity>
            ) : null}
            <View style={styles.search}>
              <Search size={18} color={colors.textMuted} />
              <CustomTextInput
                value={query}
                onChangeText={setQuery}
                placeholder={t("social.search.placeholder")}
                placeholderTextColor={colors.textMuted}
                style={styles.input}
              />
              {searching && <ActivityIndicator color={colors.accent} />}
            </View>
            {searchError ? (
              <CustomText style={[styles.muted, styles.searchError]}>
                {t("social.errors.search")}
              </CustomText>
            ) : null}
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <CustomText style={styles.muted}>{emptyText}</CustomText>
          </View>
        }
        renderItem={({ item }) => {
          const isSearch = query.trim().length >= 2;
          const isConversation =
            "type" in item && (item.type === "dm" || item.type === "group");

          let label = "";
          let subtitle = "";

          if (isSearch && "handle" in item) {
            // Search results: @handle as label, displayName as subtitle
            label = `@${item.handle}`;
            subtitle = item.displayName;
          } else if ("from" in item) {
            // Friend request: sender's displayName as label, @handle as subtitle
            const profile = friendProfiles[item.from];
            label = profile?.displayName ?? "Player";
            subtitle = profile?.handle ? `@${profile.handle}` : "";
          } else if (isConversation) {
            // Conversation row
            if (item.type === "dm") {
              const otherUid = item.members.find((member) => member !== uid);
              const profile = otherUid ? friendProfiles[otherUid] : null;
              label = profile?.displayName ?? "Player";
              subtitle = item.lastMessage?.text ?? "No messages yet";
            } else {
              label = item.title ?? "Group";
              subtitle = item.lastMessage?.text ?? "No messages yet";
            }
          } else if ("members" in item) {
            // Friendship: friend's displayName as label, @handle as subtitle
            const otherUid = item.members.find((member) => member !== uid);
            const profile = otherUid ? friendProfiles[otherUid] : null;
            label = profile?.displayName ?? "Player";
            subtitle = profile?.handle ? `@${profile.handle}` : "";
          } else {
            label = "";
          }

          return (
            <TouchableOpacity
              style={styles.row}
              onPress={() => {
                if (isConversation) {
                  navigation.navigate("ChatScreen", { conversationId: item.id });
                  return;
                }
                const targetUid =
                  "uid" in item
                    ? item.uid
                    : "from" in item
                      ? item.from
                      : item.members.find((member) => member !== uid);
                if (targetUid) {
                  navigation.getParent()?.navigate("Settings", {
                    screen: "UserProfile",
                    params: { uid: targetUid },
                  });
                }
              }}
              disabled={
                !isConversation && !("uid" in item || "from" in item || "members" in item)
              }
            >
              <View style={styles.rowText}>
                <CustomText style={styles.rowText}>{label}</CustomText>
                {subtitle ? (
                  <CustomText style={styles.muted}>{subtitle}</CustomText>
                ) : null}
              </View>
              {isConversation && unreadCounts[item.id] ? (
                <View style={styles.unreadBadge}>
                  <CustomText style={styles.unreadText}>
                    {unreadCounts[item.id]}
                  </CustomText>
                </View>
              ) : null}
              {isSearch && "uid" in item && (
                <TouchableOpacity
                  style={styles.action}
                  onPress={() => void sendFriendRequest(item.uid)}
                >
                  <UserPlus size={16} color={colors.onAccent} />
                </TouchableOpacity>
              )}
              {!isSearch && "from" in item && (
                <>
                  <TouchableOpacity
                    style={styles.action}
                    onPress={() => void respondFriendRequest(item.from, "accept")}
                  >
                    <Check size={16} color={colors.onAccent} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.action, styles.dangerAction]}
                    onPress={() => void respondFriendRequest(item.from, "decline")}
                  >
                    <X size={16} color={colors.onAccent} />
                  </TouchableOpacity>
                </>
              )}
            </TouchableOpacity>
          );
        }}
      />
      </SafeAreaView>
    </>
  );
}
