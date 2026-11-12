import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  // Core Clipboard is deprecated in RN but still ships in the native build;
  // swap to @react-native-clipboard/clipboard when a native rebuild is planned.
  Clipboard,
  I18nManager,
  Platform,
  TouchableOpacity,
  View,
} from "react-native";
import { Alert, type AlertButton } from "@/src/lib/alert";
import { Image } from "expo-image";
import { ArrowLeft, MoreVertical, Send, Users } from "lucide-react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import type { RouteProp } from "@react-navigation/native";
import type { SocialMessage, Conversation } from "@gaming-zone/core";
import CustomText from "@/src/components/CustomText";
import CustomTextInput from "@/src/components/CustomTextInput";
import IconButton from "@/src/components/IconButton";
import GamerAvatar from "../components/GamerAvatar";
import ChatMenuSheet from "../components/social/ChatMenuSheet";
import GameBottomSheet from "../components/GameBottomSheet";
import PlaySessionCard from "../components/PlaySessionCard";
import ChatMessageList from "../components/ChatMessageList";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useAuthStore } from "@/src/store/useAuthStore";
import { useTabBarStore } from "@/src/store/useTabBarStore";
import { logger } from "@/src/lib/logger";
import { showToast } from "@/src/lib/toast";
import type { SocialStackParamList } from "@/src/navigation/AppNavigator";
import {
  deleteMessageForMe,
  editMessage,
  listenToReadPosition,
  sendMessage,
} from "../lib/chatService";
import { useChatMenu } from "../hooks/useChatMenu";
import { usePeerPresence } from "../hooks/usePeerPresence";
import { usePlaySessions } from "../hooks/usePlaySessions";
import { useChatProfiles } from "../hooks/useChatProfiles";
import { useChatMessages } from "../hooks/useChatMessages";
import { useConversationDetails } from "../hooks/useConversationDetails";
import type { SessionActionErrorHandler } from "../hooks/useSessionActions";

export default function ChatScreen(): React.ReactElement {
  const route = useRoute<RouteProp<SocialStackParamList, "ChatScreen">>();
  const navigation = useNavigation<NativeStackNavigationProp<SocialStackParamList>>();
  const { t } = useTranslation();
  const uid = useAuthStore((state) => state.user?.uid ?? "");
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const styles = useThemeStyles((c) => ({
    container: { flex: 1, backgroundColor: c.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: c.accentBorder,
      backgroundColor: c.backgroundDeep,
    },
    headerText: { flex: 1 },
    headerSubtitle: { color: c.textMuted, fontSize: 11, marginTop: 2 },
    avatarRing: {
      borderWidth: 1,
      borderColor: c.accentBorder,
      borderRadius: 24,
      padding: 2,
    },
    groupMember: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    headerLtr: { flexDirection: "row" },
    headerRtl: { flexDirection: "row-reverse" },
    headerAvatar: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: c.background,
    },
    headerName: { color: c.text, fontSize: 17, fontWeight: "700" },
    composer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingTop: 10,
      paddingHorizontal: 10,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    input: {
      flex: 1,
      color: c.text,
      backgroundColor: c.surface,
      borderRadius: 20,
      paddingHorizontal: 15,
      paddingVertical: 10,
    },
    send: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.accent,
    },
    sendError: { color: c.danger, fontSize: 11 },
  }));

  const [text, setText] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [sendError, setSendError] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const sending = useRef(false);
  const conversationId = route.params.conversationId;
  const setIsVisible = useTabBarStore((state) => state.setIsVisible);

  useFocusEffect(
    useCallback(() => {
      setIsVisible(false);
      return () => {
        setIsVisible(true);
      };
    }, [setIsVisible]),
  );

  const {
    type: conversationType,
    members: conversationMembers,
    admins: conversationAdmins,
    title: conversationTitle,
    photoURL: conversationPhotoURL,
  } = useConversationDetails(conversationId);
  const latestSession = usePlaySessions(uid)
    .filter(
      (session) =>
        session.conversationId === conversationId &&
        session.status !== "completed" &&
        session.status !== "cancelled" &&
        !(
          session.status === "confirmed" &&
          typeof session.startsAt === "number" &&
          session.startsAt <= Date.now()
        ),
    )
    .sort((a, b) => {
      const aTime = typeof a.startsAt === "number" ? a.startsAt : 0;
      const bTime = typeof b.startsAt === "number" ? b.startsAt : 0;
      return bTime - aTime;
    })[0];
  // Chat-menu sheet state (shared with the social screen via `useChatMenu`).
  // This screen resolves the conversation from its own details subscription;
  // leave/delete drop back into the stack (`goBack`) once handled.
  const resolveChatMenuConversation = useCallback(
    (): Conversation =>
      ({
        id: conversationId,
        type: conversationType === "group" ? "group" : "dm",
        title: conversationTitle,
        photoURL: conversationPhotoURL,
        members: conversationMembers,
        admins: conversationAdmins,
        dmKey: null,
        lastMessage: null,
        lastMessageAt: null,
      }) as Conversation,
    [
      conversationId,
      conversationType,
      conversationTitle,
      conversationPhotoURL,
      conversationMembers,
      conversationAdmins,
    ],
  );
  const chatMenu = useChatMenu({
    uid,
    resolveConversation: resolveChatMenuConversation,
    onLeft: () => navigation.goBack(),
    onDeleted: () => navigation.goBack(),
  });

  const handleOpenGroupSettings = useCallback((_id: string) => {
    chatMenu.closeMenu();
    // Reuse the members sheet for editing; group settings sheet not mounted here,
    // so fall back to the members sheet.
    setMembersOpen(true);
  }, [chatMenu]);
  const {
    messages,
    olderMessages,
    loading,
    loadError,
    hasOlderMessages,
    loadingOlder,
    loadOlder,
  } = useChatMessages(conversationId, uid);
  const senderUids = useMemo(
    () =>
      Array.from(
        new Set(
          [...messages, ...olderMessages]
            .map((item) => item.senderId)
            .filter((senderId) => senderId && senderId !== uid && senderId !== "system"),
        ),
      ),
    [messages, olderMessages, uid],
  );
  const senderProfiles = useChatProfiles(senderUids);
  const conversationProfiles = useChatProfiles(
    conversationMembers.filter((member) => member !== uid),
  );
  const otherMemberId = conversationMembers.find((member) => member !== uid) ?? "";
  const otherProfile = otherMemberId ? conversationProfiles[otherMemberId] : undefined;
  const headerName =
    conversationTitle ?? otherProfile?.displayName ?? t("social.chats.conversation");
  const headerPhotoURL = conversationPhotoURL ?? otherProfile?.photoURL;
  const memberProfiles = conversationMembers
    .filter((member) => member !== uid)
    .map((member) => ({ uid: member, profile: conversationProfiles[member] }))
    .filter((item) => item.profile);

  // Header presence (DM only): a single-doc listener on the peer's heartbeat,
  // shared with the friends list through `usePeerPresence` / `lib/presence`.
  const peerUid =
    conversationType === "dm" && conversationMembers.length === 2
      ? (conversationMembers.find((member) => member !== uid) ?? null)
      : null;
  const presence = usePeerPresence(peerUid);

  // Read receipts (v1: 1:1 chats only). `markConversationRead` already keeps
  // *this* user's `reads/{uid}.lastReadAt` fresh on every message snapshot;
  // the only new work is one extra doc get on the peer's read row — allowed
  // for members by firestore.rules — to know when own messages were seen.
  // Groups are excluded: a dormant member would pin "not read" forever.
  const [peerLastReadAt, setPeerLastReadAt] = useState<number | null>(null);
  useEffect(() => {
    if (!peerUid) {
      setPeerLastReadAt(null);
      return;
    }
    return listenToReadPosition(
      conversationId,
      peerUid,
      (position) => setPeerLastReadAt(position.lastReadAt),
      (error) => {
        logger.warn("[social] Failed to load peer read position", error);
        setPeerLastReadAt(null);
      },
    );
  }, [conversationId, peerUid]);

  const submit = async (): Promise<void> => {
    const value = text.trim();
    if (!value || sending.current || !uid) return;
    sending.current = true;
    setText("");
    setSendError(false);
    try {
      if (editingMessageId) {
        await editMessage(conversationId, editingMessageId, value);
        setEditingMessageId(null);
      } else {
        await sendMessage(conversationId, uid, value);
      }
    } catch {
      setSendError(true);
      setText(value);
    } finally {
      sending.current = false;
    }
  };

  const showMessageActions = useCallback(
    (item: SocialMessage): void => {
      if (item.deletedFor.includes(uid)) return;

      // Copy is available for any visible message (own or a friend's);
      // edit / delete-for-me stays limited to own messages inside the
      // 10-minute window, exactly as before.
      const canAct =
        item.senderId === uid &&
        item.createdAt !== null &&
        Date.now() - item.createdAt <= 10 * 60 * 1000;

      const options: AlertButton[] = [
        {
          text: t("social.chats.copy"),
          onPress: () => {
            Clipboard.setString(item.text);
            showToast(t("social.chats.copied"));
          },
        },
      ];
      if (canAct) {
        options.push(
          {
            text: t("social.chats.edit"),
            onPress: () => {
              setEditingMessageId(item.id);
              setText(item.text);
            },
          },
          {
            text: t("social.chats.deleteForMe"),
            style: "destructive",
            onPress: () => void deleteMessageForMe(conversationId, item.id),
          },
        );
      }
      options.push({ text: t("common.cancel"), style: "cancel" });

      Alert.alert(t("social.chats.messageActions"), undefined, options);
    },
    [conversationId, t, uid],
  );

  const handleSessionError = useCallback<SessionActionErrorHandler>((error, action) => {
    logger.error(`[social] Session ${action} failed`, error);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ChatMenuSheet
        conversation={chatMenu.conversation}
        state={chatMenu.state}
        busy={chatMenu.busy}
        uid={uid}
        onClose={chatMenu.closeMenu}
        onToggleMuted={chatMenu.toggleMuted}
        onToggleArchived={chatMenu.toggleArchived}
        onLeaveGroup={chatMenu.leaveGroup}
        onDelete={chatMenu.delete}
        onOpenSettings={handleOpenGroupSettings}
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
      >
        <GameBottomSheet
          visible={membersOpen}
          onClose={() => setMembersOpen(false)}
          name="ConversationMembersSheet"
          file="src/features/social/screens/ChatScreen.tsx"
        >
          <CustomText style={styles.headerName}>{t("social.chats.members")}</CustomText>
          {memberProfiles.map(({ uid: memberUid, profile }) => (
            <TouchableOpacity
              key={memberUid}
              style={styles.groupMember}
              onPress={() => setMembersOpen(false)}
            >
              <GamerAvatar photoURL={profile?.photoURL} size={38} />
              <View style={styles.headerText}>
                <CustomText style={styles.headerName}>
                  {profile?.displayName ?? t("social.groups.fallback")}
                </CustomText>
                <CustomText style={styles.headerSubtitle}>
                  {t("social.chats.member")}
                </CustomText>
              </View>
            </TouchableOpacity>
          ))}
        </GameBottomSheet>
        <View
          style={[styles.header, I18nManager.isRTL ? styles.headerRtl : styles.headerLtr]}
        >
          <IconButton
            feedback="opacity"
            onPress={() => navigation.goBack()}
            accessibilityLabel={t("common.back")}
          >
            <ArrowLeft size={22} color={colors.text} />
          </IconButton>
          <TouchableOpacity
            style={styles.avatarRing}
            onPress={() => (conversationTitle ? setMembersOpen(true) : undefined)}
            disabled={!conversationTitle}
          >
            <Image
              source={
                headerPhotoURL
                  ? { uri: headerPhotoURL }
                  : require("@/assets/default_profile.webp")
              }
              style={styles.headerAvatar}
              contentFit="cover"
              transition={150}
              cachePolicy="memory-disk"
              accessibilityIgnoresInvertColors
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerText}
            onPress={() => (conversationTitle ? setMembersOpen(true) : undefined)}
            disabled={!conversationTitle}
          >
            <CustomText style={styles.headerName} numberOfLines={1}>
              {headerName}
            </CustomText>
            <CustomText style={styles.headerSubtitle}>
              {conversationTitle
                ? t("social.chats.groupMembers", { count: conversationMembers.length })
                : presence.online
                  ? t("social.presence.online")
                  : presence.lastSeenLabel
                    ? t("social.presence.lastSeen", { when: presence.lastSeenLabel })
                    : t("social.chats.directMessage")}
            </CustomText>
          </TouchableOpacity>
          <IconButton
            variant="surface"
            size={38}
            onPress={() => chatMenu.openMenu(conversationId)}
          >
            {conversationTitle ? (
              <Users size={18} color={colors.accentText} />
            ) : (
              <MoreVertical size={18} color={colors.textMuted} />
            )}
          </IconButton>
        </View>
        {latestSession ? (
          <PlaySessionCard
            key={latestSession.id}
            session={latestSession}
            currentUid={uid}
            variant="chat"
            onError={handleSessionError}
          />
        ) : null}
        <ChatMessageList
          messages={messages}
          olderMessages={olderMessages}
          uid={uid}
          senderProfiles={senderProfiles}
          otherLastReadAt={peerLastReadAt}
          loading={loading}
          loadError={loadError}
          hasOlderMessages={hasOlderMessages}
          loadingOlder={loadingOlder}
          onLoadOlder={loadOlder}
          onShowActions={showMessageActions}
        />
        <View style={[styles.composer]}>
          {sendError ? (
            <CustomText style={styles.sendError}>
              {t("social.chats.unableSend")}
            </CustomText>
          ) : null}
          <CustomTextInput
            value={text}
            onChangeText={setText}
            placeholder={t("social.chats.messagePlaceholder")}
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            multiline
            onSubmitEditing={() => void submit()}
          />
          <TouchableOpacity
            style={styles.send}
            onPress={() => void submit()}
            accessibilityRole="button"
          >
            <Send size={18} color={colors.onAccent} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
