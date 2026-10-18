import React, { memo, useCallback, useEffect, useRef } from "react";
import { KeyboardAvoidingView } from "react-native";
import { FlashList } from "@shopify/flash-list";
import type { FlashListRef } from "@shopify/flash-list";
import { SafeAreaView } from "react-native-safe-area-context";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useBottomInset } from "@/src/hooks/useBottomInset";
import ChatMessageBubble from "../components/ChatMessageBubble";
import ChatSuggestions from "../components/ChatSuggestions";
import TypingIndicator from "../components/TypingIndicator";
import ChatInputBar from "../components/ChatInputBar";
import { useAIChat } from "../hooks/useAIChat";
import { useKeyboardVisible } from "../hooks/useKeyboardVisible";
import type { ChatMessage } from "../types";

/**
 * Auto-scroll rule: the chat stays pinned to the newest message only while the
 * user is already reading the tail. The threshold is fixed here (not tuned
 * per-case): content whose tail is within NEAR_BOTTOM_THRESHOLD_PX of the
 * viewport counts as "at the bottom". A new message appends (contentHeight
 * grows) and keyboard opens/closes (viewHeight shrinks/grows) both trigger
 * content-size or layout callbacks — each header is scrolled-to-end only when
 * the user was near the bottom beforehand, so scrolled-up history is never
 * yanked down.
 */
const NEAR_BOTTOM_THRESHOLD_PX = 120;

const AIChatScreen: React.FC = memo(() => {
  const { messages, input, setInput, isLoading, remaining, handleSend } = useAIChat();
  const keyboardVisible = useKeyboardVisible();
  const flatListRef = useRef<FlashListRef<ChatMessage>>(null);
  // Latest observed geometry for the near-bottom check; refs so the callbacks
  // passed to FlashList stay referentially stable.
  const geometryRef = useRef({ contentHeight: 0, viewHeight: 0, offset: 0 });
  const scrollToEndIfNearBottom = useCallback(() => {
    const { contentHeight, viewHeight, offset } = geometryRef.current;
    const tailDistance = contentHeight - viewHeight - offset;
    if (tailDistance < NEAR_BOTTOM_THRESHOLD_PX) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, []);
  const bottomInset = useBottomInset();

  const styles = useThemeStyles(
    (c) => ({
      container: {
        flex: 1,
        backgroundColor: c.background,
      },
      containerKeyboardClosed: {
        paddingBottom: bottomInset,
      },
      keyboardView: {
        flex: 1,
      },
      listContent: {
        padding: 16,
        paddingBottom: 20,
      },
    }),
    [bottomInset],
  );

  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => <ChatMessageBubble item={item} />,
    [],
  );

  // A genuinely new message (user send arriving, reply landing) always pins the
  // list to the end — the near-bottom rule only guards ambient size changes
  // like the keyboard animating in/out.
  const visibleMessages = messages.filter((m) => m.role !== "system");
  const messageCount = visibleMessages.length;
  const lastCountRef = useRef(messageCount);
  useEffect(() => {
    if (messageCount > lastCountRef.current) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
    lastCountRef.current = messageCount;
  }, [messageCount]);

  return (
    <SafeAreaView
      style={[styles.container, !keyboardVisible && styles.containerKeyboardClosed]}
      edges={["left", "right"]}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior="padding"
      >
        <FlashList
          ref={flatListRef}
          data={visibleMessages}
          keyExtractor={(item) => item.localId}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={(_w, h) => {
            geometryRef.current.contentHeight = h;
            scrollToEndIfNearBottom();
          }}
          onLayout={(e) => {
            geometryRef.current.viewHeight = e.nativeEvent.layout.height;
            scrollToEndIfNearBottom();
          }}
          onScroll={(e) => {
            geometryRef.current.offset = e.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={100}
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
