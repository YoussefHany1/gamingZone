import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  // Core Clipboard is deprecated in RN but still ships in the native build;
  // swap to @react-native-clipboard/clipboard when a native rebuild is planned.
  Clipboard,
  I18nManager,
  Platform,
  TouchableOpacity,
  View,
  type AlertButton,
} from "react-native";
import { Image } from "expo-image";
import { ArrowLeft, ArrowRight, MoreVertical, Send, Users } from "lucide-react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import type { RouteProp } from "@react-navigation/native";
import type { SocialMessage } from "@gaming-zone/core";
import CustomText from "@/src/components/CustomText";
import CustomTextInput from "@/src/components/CustomTextInput";
import PressScale from "../components/PressScale";
import GamerAvatar from "../components/GamerAvatar";
import GameBottomSheet from "../components/GameBottomSheet";
import PlaySessionCard from "../components/PlaySessionCard";
import ChatMessageList from "../components/ChatMessageList";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useAuthStore } from "@/src/store/useAuthStore";
import { logger } from "@/src/lib/logger";
import { showToast } from "@/src/lib/toast";
import firestore from "@react-native-firebase/firestore";
import type { SocialStackParamList } from "@/src/navigation/AppNavigator";
import { deleteMessageForMe, editMessage, listenToReadPosition, sendMessage } from "../lib/chatService";
import { relativeTime } from "../lib/relativeTime";
import { usePlaySessions } from "../hooks/usePlaySessions";
import { useChatProfiles } from "../hooks/useChatProfiles";
import { useChatMessages } from "../hooks/useChatMessages";
import { useConversationDetails } from "../hooks/useConversationDetails";
import type { SessionActionErrorHandler } from "../hooks/useSessionActions";

export default function ChatScreen(): React.ReactElement {
  const route = useRoute<RouteProp<SocialStackParamList, "ChatScreen">>();
  const navigation = useNavigation<NativeStackNavigationProp<SocialStackParamList>>();
  const { t, i18n } = useTranslation();
  const uid = useAuthStore((state) => state.user?.uid ?? "");
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const styles = useThemeStyles((c) => ({
    container: { flex: 1, backgroundColor: c.background, marginBottom: 25 },
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
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    headerText: { flex: 1 },
    headerSubtitle: { color: c.textMuted, fontSize: 11, marginTop: 2 },
    headerAction: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.surface,
    },
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

  const {
    type: conversationType,
    members: conversationMembers,
    title: conversationTitle,
    photoURL: conversationPhotoURL,
  } = useConversationDetails(conversationId);
  const latestSession = usePlaySessions(uid)
    .filter(
      (session) =>
        session.conversationId === conversationId &&
        session.status !== "completed" &&
        session.status !== "cancelled",
    )
    .sort((a, b) => {
      const aTime = typeof a.startsAt === "number" ? a.startsAt : 0;
      const bTime = typeof b.startsAt === "number" ? b.startsAt : 0;
      return bTime - aTime;
    })[0];
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

  // Read receipts (v1: 1:1 chats only). `markConversationRead` already keeps
  // *this* user's `reads/{uid}.lastReadAt` fresh on every message snapshot;
  // the only new work is one extra doc get on the peer's read row — allowed
  // for members by firestore.rules — to know when own messages were seen.
  // Groups are excluded: a dormant member would pin "not read" forever.
  const peerUid =
    conversationType === "dm" && conversationMembers.length === 2
      ? (conversationMembers.find((member) => member !== uid) ?? null)
      : null;
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

  // Header presence (DM only): a single-doc listener on the peer's heartbeat.
  // The doc lives in the dedicated `presence` collection, which any authed
  // user may read (firestore.rules). Online is client-computed with the same
  // 5-minute window the friends list uses; a timer flips the label once the
  // window expires even without another snapshot.
  const [peerPresenceAt, setPeerPresenceAt] = useState<number | null>(null);
  const [, setPresenceClock] = useState(0);
  useEffect(() => {
    if (!peerUid) {
      setPeerPresenceAt(null);
      return;
    }
    return firestore()
      .collection("presence")
      .doc(peerUid)
      .onSnapshot(
        (snapshot) => {
          const updatedAt = snapshot.data()?.updatedAt;
          setPeerPresenceAt(typeof updatedAt === "number" ? updatedAt : null);
        },
        (error) => {
          logger.warn("[social] Failed to load peer presence", error);
          setPeerPresenceAt(null);
        },
      );
  }, [peerUid]);
  useEffect(() => {
    if (peerPresenceAt === null) return;
    const expiresAt = peerPresenceAt + 5 * 60_000;
    const delay = expiresAt - Date.now();
    if (delay <= 0) {
      setPresenceClock((tick) => tick + 1);
      return;
    }
    const timer = setTimeout(() => setPresenceClock((tick) => tick + 1), delay);
    return () => clearTimeout(timer);
  }, [peerPresenceAt]);
  const peerOnline =
    peerUid !== null &&
    peerPresenceAt !== null &&
    Date.now() - peerPresenceAt < 5 * 60_000;
  const peerLastSeenLabel =
    peerUid !== null && peerPresenceAt !== null && !peerOnline
      ? relativeTime(peerPresenceAt, i18n.language)
      : "";

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
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel={t("common.back")}
          >
            {I18nManager.isRTL ? (
              <ArrowRight size={22} color={colors.text} />
            ) : (
              <ArrowLeft size={22} color={colors.text} />
            )}
          </TouchableOpacity>
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
                : peerOnline
                  ? t("social.presence.online")
                  : peerLastSeenLabel
                    ? t("social.presence.lastSeen", { when: peerLastSeenLabel })
                    : t("social.chats.directMessage")}
            </CustomText>
          </TouchableOpacity>
          <PressScale
            style={styles.headerAction}
            onPress={() => (conversationTitle ? setMembersOpen(true) : undefined)}
            disabled={!conversationTitle}
          >
            {conversationTitle ? (
              <Users size={18} color={colors.accentText} />
            ) : (
              <MoreVertical size={18} color={colors.textMuted} />
            )}
          </PressScale>
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
        <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
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
