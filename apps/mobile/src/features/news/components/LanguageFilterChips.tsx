import React, { memo, useCallback } from "react";
import { Pressable, ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import type { NewsLanguageFilter } from "../types";

type LanguageFilterChipsProps = {
  value: NewsLanguageFilter;
  onChange: (value: NewsLanguageFilter) => void;
};

const OPTIONS: NewsLanguageFilter[] = ["all", "ar", "en"];

/**
 * Compact language selector shown when the feed is on "All sources", so the
 * user can pick the content language of the combined feed. Defaults to the app
 * language (set by the caller), with "All languages" as an explicit opt-out.
 */
const LanguageFilterChips = memo(function LanguageFilterChips({
  value,
  onChange,
}: LanguageFilterChipsProps) {
  const { t } = useTranslation();

  const styles = useThemeStyles((c) => ({
    scroll: {
      flexGrow: 0,
    },
    content: {
      paddingHorizontal: 15,
      paddingTop: 8,
      paddingBottom: 2,
      gap: 8,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    chipSelected: {
      backgroundColor: c.accentSurface,
      borderColor: c.accent,
    },
    label: {
      fontSize: 12,
      fontWeight: "600",
      color: c.textMuted,
    },
    labelSelected: {
      color: c.accentText,
    },
  }));

  const handlePress = useCallback(
    (next: NewsLanguageFilter) => {
      if (next !== value) onChange(next);
    },
    [onChange, value],
  );

  return (
    <ScrollView
      horizontal
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {OPTIONS.map((option) => {
        const selected = option === value;
        const label = t(`news.languageFilter.${option}`);

        return (
          <Pressable
            key={option}
            onPress={() => handlePress(option)}
            style={[styles.chip, selected && styles.chipSelected]}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={label}
            hitSlop={4}
          >
            <CustomText style={[styles.label, selected && styles.labelSelected]}>
              {label}
            </CustomText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
});

LanguageFilterChips.displayName = "LanguageFilterChips";

export default LanguageFilterChips;
