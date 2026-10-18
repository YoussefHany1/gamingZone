import React, { memo, useMemo } from "react";
import { View } from "react-native";
import Markdown from "react-native-markdown-display";
import CustomText from "@/src/components/CustomText";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import type { ChatMessageBubbleProps } from "./types";

/** A single chat bubble: user text on the right, AI markdown on the left. */
const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({ item }) => {
  const colors = useThemeColors();
  const styles = useThemeStyles((c) => ({
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
    modelTag: {
      fontSize: 10,
      color: c.textSubtle,
      marginTop: 4,
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

  const isUser = item.role === "user";

  return (
    <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}>
      {isUser ? (
        <CustomText style={styles.userText}>{item.content}</CustomText>
      ) : (
        <View>
          <Markdown style={markdownStyles}>{item.content}</Markdown>
          {item.model && <CustomText style={styles.modelTag}>{item.model}</CustomText>}
        </View>
      )}
    </View>
  );
};

export default memo(ChatMessageBubble);
