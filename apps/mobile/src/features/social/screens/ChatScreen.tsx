import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  View,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Send } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { SocialMessage } from "@gaming-zone/core";
import CustomText from "@/src/components/CustomText";
import CustomTextInput from "@/src/components/CustomTextInput";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useAuthStore } from "@/src/store/useAuthStore";
import type { SocialStackParamList } from "@/src/navigation/AppNavigator";
import { listenToMessages, markConversationRead, sendMessage } from "../lib/chatService";

export default function ChatScreen(): React.ReactElement {
  const route = useRoute<RouteProp<SocialStackParamList, "ChatScreen">>();
  const uid = useAuthStore((state) => state.user?.uid ?? "");
  const colors = useThemeColors();
  const styles = useThemeStyles((c) => ({
    container: { flex: 1, backgroundColor: c.background },
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
  }));
  const [messages, setMessages] = useState<SocialMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sendError, setSendError] = useState(false);
  const sending = useRef(false);
  const conversationId = route.params.conversationId;

  useEffect(() => {
    const stop = listenToMessages(
      conversationId,
      (next) => {
        setMessages(next);
        setLoading(false);
        void markConversationRead(conversationId, uid);
      },
      () => setLoading(false),
    );
    return stop;
  }, [conversationId, uid]);

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
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {loading ? (
          <View style={styles.empty}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.empty}>
            <CustomText style={styles.message}>Start the conversation</CustomText>
          </View>
        ) : (
          <FlashList
            data={[...messages].reverse()}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.content}
            renderItem={({ item }) => {
              const own = item.senderId === uid;
              return (
                <View
                  style={[styles.bubble, own ? styles.ownBubble : styles.otherBubble]}
                >
                  <CustomText style={[styles.message, own && styles.ownMessage]}>
                    {item.deletedFor.includes(uid) ? "Message removed" : item.text}
                  </CustomText>
                </View>
              );
            }}
          />
        )}
        <View style={styles.composer}>
          {sendError ? (
            <CustomText style={[styles.message, { color: colors.danger }]}>Unable to send</CustomText>
          ) : null}
          <CustomTextInput
            value={text}
            onChangeText={setText}
            placeholder="Message"
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
