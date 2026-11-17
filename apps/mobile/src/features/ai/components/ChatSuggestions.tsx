import React, { memo, useMemo } from "react";
import { View, ScrollView, Pressable } from "react-native";
import CustomText from "@/src/components/CustomText";
import { useTranslation } from "react-i18next";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import type { ChatSuggestionsProps } from "./types";

/** Horizontally scrolling starter prompts shown before the first user message. */
const ChatSuggestions: React.FC<ChatSuggestionsProps> = ({ onSelect }) => {
  const { t } = useTranslation();
  const styles = useThemeStyles((c) => ({
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
  }));

  const suggestions = useMemo(
    () => [
      t("aiChat.suggestions.basedOnList"),
      t("aiChat.suggestions.bestAdventure"),
      t("aiChat.suggestions.coopGames"),
      t("aiChat.suggestions.newReleases"),
    ],
    [t],
  );

  return (
    <View style={styles.suggestionsContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.suggestionsList}
      >
        {suggestions.map((suggestion, index) => (
          <Pressable
            key={index}
            style={({ pressed }) => [styles.suggestionChip, pressed && { opacity: 0.85 }]}
            onPress={() => onSelect(suggestion)}
            hitSlop={{ top: 8, bottom: 8 }}
            android_ripple={{ color: "rgba(128,128,128,0.25)", borderless: false }}
            accessibilityRole="button"
          >
            <CustomText style={styles.suggestionText}>{suggestion}</CustomText>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};

export default memo(ChatSuggestions);
