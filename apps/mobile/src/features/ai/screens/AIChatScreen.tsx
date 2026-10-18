import React, { memo, useCallback, useRef } from "react";
import { KeyboardAvoidingView, Platform } from "react-native";
import { FlashList } from "@shopify/flash-list";
import type { FlashListRef } from "@shopify/flash-list";
import { SafeAreaView } from "react-native-safe-area-context";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import ChatMessageBubble from "../components/ChatMessageBubble";
import ChatSuggestions from "../components/ChatSuggestions";
import TypingIndicator from "../components/TypingIndicator";
import ChatInputBar from "../components/ChatInputBar";
import { useAIChat } from "../hooks/useAIChat";
import { useKeyboardVisible } from "../hooks/useKeyboardVisible";
import type { ChatMessage } from "../types";

const AIChatScreen: React.FC = memo(() => {
  const { messages, input, setInput, isLoading, remaining, handleSend } = useAIChat();
  const keyboardVisible = useKeyboardVisible();
  const flatListRef = useRef<FlashListRef<ChatMessage>>(null);

  const styles = useThemeStyles((c) => ({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    containerKeyboardClosed: {
      paddingBottom: 90,
    },
    keyboardView: {
      flex: 1,
    },
    listContent: {
      padding: 16,
      paddingBottom: 20,
    },
  }));

  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => <ChatMessageBubble item={item} />,
    [],
  );

  return (
    <SafeAreaView
      style={[styles.container, !keyboardVisible && styles.containerKeyboardClosed]}
      edges={["left", "right"]}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
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
        {isLoading && <TypingIndicator />}
        {messages.length <= 1 && <ChatSuggestions onSelect={setInput} />}
        <ChatInputBar
          value={input}
          onChangeText={setInput}
          onSend={handleSend}
          remaining={remaining}
          isLoading={isLoading}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
});

AIChatScreen.displayName = "AIChatScreen";

export default AIChatScreen;
