import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Markdown from "react-native-markdown-display";
import { useTranslation } from "react-i18next";
import { sendChatMessage, ChatMessage } from "../lib/aiService";
import { checkAILimit, incrementAILimit, getRemainingAILimit, MAX_MESSAGES_PER_DAY } from "../lib/aiLimit";
import COLORS from "../constants/colors";

const AIChatScreen: React.FC = memo(() => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const flatListRef = useRef<FlashList<any>>(null);

  const suggestions = useMemo(() => [
    t("aiChat.suggestions.basedOnList"),
    t("aiChat.suggestions.bestAdventure"),
    t("aiChat.suggestions.coopGames"),
    t("aiChat.suggestions.newReleases")
  ], [t]);

  useEffect(() => {
    // Initial welcome message
    setMessages([
      { role: "assistant", content: t("aiChat.placeholder") }
    ]);
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
      setRemaining(prev => (prev && prev > 0) ? prev - 1 : 0);

      // We only pass the user/assistant history to the model, limit to last 10
      const historyToPass = newChat.filter(m => m.role !== "system").slice(-10);
      const reply = await sendChatMessage(historyToPass);

      setMessages((prev) => [...prev, { role: "assistant", content: reply.text, model: reply.model }]);
    } catch (error) {
      console.error(error);
      Alert.alert(t("common.error"), t("aiChat.error"));
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, t]);

  const renderItem = useCallback(({ item }: { item: ChatMessage }) => {
    const isUser = item.role === "user";
    return (
      <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}>
        {isUser ? (
          <Text style={styles.userText}>{item.content}</Text>
        ) : (
          <View>
            <Markdown style={markdownStyles}>{item.content}</Markdown>
            {item.model && (
              <Text style={styles.modelTag}>{item.model} 🤖</Text>
            )}
          </View>
        )}
      </View>
    );
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <FlashList
        ref={flatListRef}
        data={messages.filter(m => m.role !== "system")}
        keyExtractor={(_, index) => index.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        estimatedItemSize={80}
      />
      {isLoading && (
        <View style={styles.typingContainer}>
          <ActivityIndicator size="small" color={COLORS.secondary} />
          <Text style={styles.typingText}>{t("aiChat.typing")}</Text>
        </View>
      )}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {messages.length <= 1 && (
          <View style={styles.suggestionsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionsList}>
              {suggestions.map((suggestion, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.suggestionChip}
                  onPress={() => setInput(suggestion)}
                >
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={input}
            onChangeText={setInput}
            placeholder={remaining !== null ? `${t("aiChat.placeholder")} (${remaining}/${MAX_MESSAGES_PER_DAY})` : t("aiChat.placeholder")}
            placeholderTextColor="gray"
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!input.trim() || isLoading}
          >
            <Ionicons name="send" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
});
AIChatScreen.displayName = "AIChatScreen";

export default AIChatScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
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
    backgroundColor: COLORS.secondary,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#2a3b5c",
    borderBottomLeftRadius: 4,
  },
  userText: {
    color: "#fff",
    fontSize: 16,
  },
  suggestionsContainer: {
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
  },
  suggestionsList: {
    paddingHorizontal: 16,
  },
  suggestionChip: {
    backgroundColor: "#2a3b5c",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  suggestionText: {
    color: "#fff",
    fontSize: 14,
  },
  modelTag: {
    fontSize: 10,
    color: "#8a9ebf",
    marginTop: 4,
    alignSelf: "flex-end",
  },
  typingContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  typingText: {
    color: "gray",
    marginLeft: 8,
    fontSize: 14,
    fontStyle: "italic",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: COLORS.darkBackground + "10",
    borderTopWidth: 1,
    borderTopColor: "#2a3b5c",
  },
  textInput: {
    flex: 1,
    color: "#fff",
    backgroundColor: "#2a3b5c",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: COLORS.secondary,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  sendButtonDisabled: {
    backgroundColor: "gray",
  },
});

const markdownStyles = {
  body: {
    color: "#fff",
    fontSize: 16,
  },
  link: {
    color: COLORS.secondary,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 8,
  },
  strong: {
    fontWeight: "bold" as const,
  },
};
