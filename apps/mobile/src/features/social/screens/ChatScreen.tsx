import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  View,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Send, Trash2 } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import type { RouteProp } from "@react-navigation/native";
import type { SocialMessage } from "@gaming-zone/core";
import CustomText from "@/src/components/CustomText";
import CustomTextInput from "@/src/components/CustomTextInput";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useAuthStore } from "@/src/store/useAuthStore";
import type { SocialStackParamList } from "@/src/navigation/AppNavigator";
import {
  deleteMessageForMe,
  loadOlderMessages,
  listenToMessages,
  markConversationRead,
  sendMessage,
} from "../lib/chatService";
import { usePlaySessions } from "../hooks/usePlaySessions";
import { cancelSession, confirmSession, leaveSession, respondToSlot, withdrawProposal } from "../lib/sessionService";

function formatMessageTime(value: number | null): string {
  if (typeof value !== "number") return "";
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChatScreen(): React.ReactElement {
  const route = useRoute<RouteProp<SocialStackParamList, "ChatScreen">>();
  const { t } = useTranslation();
  const uid = useAuthStore((state) => state.user?.uid ?? "");
  const colors = useThemeColors();
  const styles = useThemeStyles((c) => ({
    container: { flex: 1, backgroundColor: c.background, marginBottom: 20 },
    content: { padding: 16, paddingBottom: 10 },
    bubble: {
      maxWidth: "82%",
      padding: 11,
      borderRadius: 16,
      marginBottom: 8,
      backgroundColor: c.surface,
    },
    ownBubble: { alignSelf: "flex-end", backgroundColor: c.accent },
    otherBubble: { alignSelf: "flex-start" },
    message: { color: c.text },
    muted: { color: c.textMuted, fontSize: 11 },
    gameCard: {
      marginTop: 8,
      padding: 10,
      borderRadius: 10,
      backgroundColor: c.background,
    },
    gameTitle: { color: c.text, fontWeight: "700" },
    gameLink: { color: c.accent, fontSize: 12, marginTop: 4 },
    messageMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
    deleteButton: { padding: 4 },

    ownMessage: { color: c.onAccent },
    composer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      padding: 10,
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
    empty: { flex: 1, alignItems: "center", justifyContent: "center" },
    sessionCard: { marginHorizontal: 16, marginTop: 10, padding: 12, borderRadius: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
    sessionActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
    sessionButton: { backgroundColor: c.accent, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
    sessionSecondary: { backgroundColor: c.background, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  }));
  const [messages, setMessages] = useState<SocialMessage[]>([]);
  const [olderMessages, setOlderMessages] = useState<SocialMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sendError, setSendError] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const sending = useRef(false);
  const conversationId = route.params.conversationId;
  const sessions = usePlaySessions(uid).filter((session) => session.conversationId === conversationId && session.status !== "completed" && session.status !== "cancelled");

  useEffect(() => {
    setOlderMessages([]);
    setHasOlderMessages(false);
    const stop = listenToMessages(
      conversationId,
      (next) => {
        setMessages(next);
        setOlderMessages((current) => {
          const newestIds = new Set(next.map((item) => item.id));
          return current.filter((item) => !newestIds.has(item.id));
        });
        setHasOlderMessages((currentHasOlder) => currentHasOlder || next.length === 50);
        setLoading(false);
        setLoadError(false);
        void markConversationRead(conversationId, uid);
      },
      () => {
        setLoading(false);
        setLoadError(true);
      },
    );
    return stop;
  }, [conversationId, uid]);

  const loadOlder = async (): Promise<void> => {
    if (loadingOlder || !hasOlderMessages || messages.length === 0) return;
    setLoadingOlder(true);
    try {
      const cursor = olderMessages[olderMessages.length - 1] ?? messages[messages.length - 1];
      if (!cursor) return;
      const older = await loadOlderMessages(conversationId, cursor);
      setOlderMessages((current) => [...current, ...older]);
      setHasOlderMessages(older.length === 50);
    } catch {
      setLoadError(true);
    } finally {
      setLoadingOlder(false);
    }
  };

  const submit = async (): Promise<void> => {
    const value = text.trim();
    if (!value || sending.current || !uid) return;
    sending.current = true;
    setText("");
    setSendError(false);
    try {
      await sendMessage(conversationId, uid, value);
    } catch {
      setSendError(true);
      setText(value);
    } finally {
      sending.current = false;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {sessions.map((session) => {
          const proposal = session.proposals.find((item) => item.status !== "withdrawn");
          const accepted = proposal?.responses[uid] === "accepted";
          const everyoneAccepted = proposal && session.participantUids.every((participant) => proposal.responses[participant] === "accepted");
          return (
            <View key={session.id} style={styles.sessionCard}>
              <CustomText style={styles.gameTitle}>{session.gameName}</CustomText>
              <CustomText style={styles.muted}>{session.status}{proposal ? ` • ${new Date(proposal.startsAt).toLocaleString()}` : ""}</CustomText>
              <View style={styles.sessionActions}>
                {proposal && !accepted && session.status === "proposed" ? <TouchableOpacity style={styles.sessionButton} onPress={() => void respondToSlot(session.id, proposal.id, "accepted")}><CustomText style={{ color: colors.onAccent }}>{t("social.sessions.accept")}</CustomText></TouchableOpacity> : null}
                {proposal && accepted && session.status === "proposed" ? <TouchableOpacity style={styles.sessionSecondary} onPress={() => void respondToSlot(session.id, proposal.id, "declined")}><CustomText style={styles.message}>{t("social.sessions.decline")}</CustomText></TouchableOpacity> : null}
                {proposal && proposal.proposerUid === uid && session.status === "proposed" ? <TouchableOpacity style={styles.sessionSecondary} onPress={() => void withdrawProposal(session.id, proposal.id)}><CustomText style={styles.message}>{t("social.sessions.withdraw")}</CustomText></TouchableOpacity> : null}
                {proposal && everyoneAccepted && session.status === "proposed" ? <TouchableOpacity style={styles.sessionButton} onPress={() => void confirmSession(session.id, proposal.id)}><CustomText style={{ color: colors.onAccent }}>{t("social.sessions.confirm")}</CustomText></TouchableOpacity> : null}
                {session.status === "proposed" ? <TouchableOpacity style={styles.sessionSecondary} onPress={() => void cancelSession(session.id)}><CustomText style={styles.message}>{t("social.sessions.cancel")}</CustomText></TouchableOpacity> : null}
                <TouchableOpacity style={styles.sessionSecondary} onPress={() => void leaveSession(session.id)}><CustomText style={styles.message}>{t("social.sessions.leave")}</CustomText></TouchableOpacity>
              </View>
            </View>
          );
        })}
        {loading ? (
          <View style={styles.empty}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : loadError ? (
          <View style={styles.empty}>
            <CustomText style={[styles.message, { color: colors.danger }]}>{t("social.chats.unableLoad")}</CustomText>
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.empty}>
            <CustomText style={styles.message}>{t("social.chats.start")}</CustomText>
          </View>
        ) : (
          <FlashList
            data={[...messages, ...olderMessages].reverse()}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.content}
            ListHeaderComponent={hasOlderMessages ? <TouchableOpacity style={styles.sessionSecondary} onPress={() => void loadOlder()} disabled={loadingOlder}><CustomText style={styles.message}>{loadingOlder ? t("social.chats.loading") : t("social.chats.loadOlder")}</CustomText></TouchableOpacity> : null}
            renderItem={({ item }) => {
              const own = item.senderId === uid;
              return (
                <View
                  style={[styles.bubble, own ? styles.ownBubble : styles.otherBubble]}
                >
                  <CustomText style={[styles.message, own && styles.ownMessage]}>
                    {item.deletedFor.includes(uid) ? t("social.chats.removed") : item.text}
                  </CustomText>
                  {!item.deletedFor.includes(uid) && item.type === "game_suggestion" && item.gameName ? (
                    <View style={styles.gameCard}>
                      <CustomText style={styles.gameTitle}>{item.gameName}</CustomText>
                      <CustomText style={styles.gameLink}>{t("social.chats.openGame")}</CustomText>
                    </View>
                  ) : null}
                  <View style={styles.messageMeta}>
                    <CustomText style={[styles.muted, own && styles.ownMessage]}>
                      {formatMessageTime(item.createdAt)}
                    </CustomText>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => void deleteMessageForMe(conversationId, item.id, uid)}
                      accessibilityLabel={t("social.chats.deleteForMe")}
                    >
                      <Trash2 size={14} color={own ? colors.onAccent : colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
          />
        )}
        <View style={styles.composer}>
          {sendError ? (
            <CustomText style={[styles.message, { color: colors.danger }]}>
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
