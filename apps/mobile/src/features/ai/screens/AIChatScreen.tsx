import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import CustomTextInput from "@/src/components/CustomTextInput";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
  Keyboard,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { SafeAreaView } from "react-native-safe-area-context";
import { Send } from "lucide-react-native";
import Markdown from "react-native-markdown-display";
import { useTranslation } from "react-i18next";
import { sendChatMessage } from "../lib/aiService";
import {
  checkAILimit,
  incrementAILimit,
  getRemainingAILimit,
  MAX_MESSAGES_PER_DAY,
} from "../lib/aiLimit";
import { ChatMessage } from "../types";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import CustomText from "@/src/components/CustomText";

const AIChatScreen: React.FC = memo(() => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const flatListRef = useRef<any>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const colors = useThemeColors();

  const styles = useThemeStyles((c) => ({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    listContent: {
      padding: 16,
      paddingBottom: 20,
    },
    messageBubble: {
      maxWidth: "85%",
      padding: 12,
      borderRadius: 16,
      marginVertical: 6,
    },
    userBubble: {
      alignSelf: "flex-end",
      backgroundColor: c.accent,
      borderBottomRightRadius: 4,
    },
    aiBubble: {
      alignSelf: "flex-start",
      backgroundColor: c.surface,
      borderBottomLeftRadius: 4,
    },
    userText: {
      color: c.onAccent,
      fontSize: 16,
    },
    aiText: {
      color: c.text,
      fontSize: 16,
    },
    suggestionsContainer: {
      paddingVertical: 10,
      backgroundColor: c.background,
    },
    suggestionsList: {
      paddingHorizontal: 16,
    },
    suggestionChip: {
      backgroundColor: c.surface,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      marginRight: 10,
      borderWidth: 1,
      borderColor: c.accentBorder,
    },
    suggestionText: {
      color: c.text,
      fontSize: 14,
    },
    modelTag: {
      fontSize: 10,
      color: c.textSubtle,
      marginTop: 4,
    },
    typingRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    typingContainer: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    typingText: {
      color: c.textSubtle,
      marginLeft: 8,
      fontSize: 14,
      fontStyle: "italic",
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      padding: 12,
      backgroundColor: c.surface,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    textInput: {
      flex: 1,
      color: c.text,
      backgroundColor: c.accentSurface,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 12,
      fontSize: 16,
      maxHeight: 100,
    },
    sendButton: {
      backgroundColor: c.accent,
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: "center",
      alignItems: "center",
      marginLeft: 10,
    },
    sendButtonDisabled: {
      backgroundColor: c.textSubtle,
    },
  }));

  // `react-native-markdown-display` takes a plain style object rather than a
  // registered stylesheet, so it is derived from the palette as a value.
  const markdownStyles = useMemo(
    () => ({
      body: { color: colors.text, fontSize: 16 },
      link: { color: colors.accentText },
      paragraph: { marginTop: 0, marginBottom: 8 },
      strong: { fontWeight: "bold" as const },
    }),
    [colors],
  );

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setKeyboardVisible(true),
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardVisible(false),
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const suggestions = useMemo(
    () => [
      t("aiChat.suggestions.basedOnList"),
      t("aiChat.suggestions.bestAdventure"),
      t("aiChat.suggestions.coopGames"),
      t("aiChat.suggestions.newReleases"),
    ],
    [t],
  );

  useEffect(() => {
    // Initial welcome message
    setMessages([{ role: "assistant", content: t("aiChat.placeholder") }]);
    getRemainingAILimit().then(setRemaining);
  }, [t]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    // 1. Check Limits
    const isAllowed = await checkAILimit();
    if (!isAllowed) {
      Alert.alert(t("common.error"), t("aiChat.limitReached"));
      return;
    }

    const userMsg: ChatMessage = { role: "user", content: input.trim() };
    const newChat = [...messages, userMsg];
    setMessages(newChat);
    setInput("");
    setIsLoading(true);

    try {
      // 2. Increment usage when sending request
      await incrementAILimit();
      setRemaining((prev) => (prev && prev > 0 ? prev - 1 : 0));

      // We only pass the user/assistant history to the model, limit to last 10
      const historyToPass = newChat.filter((m) => m.role !== "system").slice(-10);
      const reply = await sendChatMessage(historyToPass);

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: reply.text, model: reply.model },
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert(t("common.error"), t("aiChat.error"));
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, t]);

  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => {
      const isUser = item.role === "user";
      return (
        <View
          style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}
        >
          {isUser ? (
            <CustomText style={styles.userText}>{item.content}</CustomText>
          ) : (
            <View>
              <Markdown style={markdownStyles}>{item.content}</Markdown>
              {item.model && (
                <CustomText style={styles.modelTag}>{item.model}</CustomText>
              )}
            </View>
          )}
        </View>
      );
    },
    [markdownStyles, styles],
  );

  return (
    <SafeAreaView
      style={[styles.container, { paddingBottom: keyboardVisible ? 0 : 90 }]}
      edges={["left", "right"]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "padding"}
      >
        <FlashList
          ref={flatListRef}
          data={messages.filter((m) => m.role !== "system")}
          keyExtractor={(_, index) => index.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
        {isLoading && (
          <View style={styles.typingContainer}>
            <ActivityIndicator size="small" color={colors.accentText} />
            <CustomText style={styles.typingText}>{t("aiChat.typing")}</CustomText>
          </View>
        )}
        {messages.length <= 1 && (
          <View style={styles.suggestionsContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestionsList}
            >
              {suggestions.map((suggestion, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.suggestionChip}
                  onPress={() => setInput(suggestion)}
                >
                  <CustomText style={styles.suggestionText}>{suggestion}</CustomText>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
        <View style={styles.inputContainer}>
          <CustomTextInput
            style={styles.textInput}
            value={input}
            onChangeText={setInput}
            placeholder={
              remaining !== null
                ? `${t("aiChat.placeholder")} (${remaining}/${MAX_MESSAGES_PER_DAY})`
                : t("aiChat.placeholder")
            }
            placeholderTextColor={colors.textSubtle}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!input.trim() || isLoading}
          >
            <Send size={24} color={colors.onAccent} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
});
AIChatScreen.displayName = "AIChatScreen";

export default AIChatScreen;
