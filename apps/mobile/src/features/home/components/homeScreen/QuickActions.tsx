import React, { memo } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Calendar, CalendarClock, Cpu, Flame, Newspaper, Sparkles, Star, TrendingUp, Trophy } from "lucide-react-native";
import { useDiscoveryRailDecision } from "@/src/features/games";
import type { DiscoveryRailKind } from "@/src/features/games";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import CustomText from "@/src/components/CustomText";
import type { QuickActionsProps } from "./types";

/** Chip targets: logical section ids reported by `HomeSections` onLayout. */
const FOR_YOU_CHIPS = {
  recommended: {
    id: "recommended",
    icon: Sparkles,
    labelKey: "home.quickActions.forYou",
  },
  trending: {
    id: "recommended",
    icon: TrendingUp,
    labelKey: "home.quickActions.trending",
  },
  popular: {
    id: "recommended",
    icon: Flame,
    labelKey: "home.quickActions.popular",
  },
} as const;

/** The full chip row; the For You chip follows the active discovery rail. */
function chipsForKind(kind: DiscoveryRailKind) {
  return [
    { id: "news_tabs:news", icon: Newspaper, labelKey: "home.sections.news" },
    {
      id: "release_calendar",
      icon: CalendarClock,
      labelKey: "home.quickActions.releases",
    },
    FOR_YOU_CHIPS[kind],
    { id: "news_tabs:reviews", icon: Star, labelKey: "home.sections.reviews" },
    { id: "insight_tabs:esports", icon: Trophy, labelKey: "home.sections.esports" },
    { id: "insight_tabs:hardware", icon: Cpu, labelKey: "home.sections.hardware" },
    { id: "events", icon: Calendar, labelKey: "home.gamingEvents.header" },
  ] as const;
}

/**
 * Quick-action chips: a lightweight horizontal row (no fetch of its own)
 * that jumps the home feed to the matching section.
 */
function QuickActions({
  onScrollToSection,
}: QuickActionsProps): React.ReactElement {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { kind } = useDiscoveryRailDecision();
  const chips = chipsForKind(kind);

  const styles = useThemeStyles((c) => ({
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: c.accentSurface,
      borderRadius: 20,
      paddingVertical: 8,
      paddingHorizontal: 14,
    },
    chipLabel: {
      color: c.text,
      fontSize: 13,
      fontWeight: "600",
    },
    listContent: {
      paddingHorizontal: 18,
      paddingVertical: 6,
      gap: 8,
    },
  }));

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {chips.map((chip) => {
          const Icon = chip.icon;
          return (
            <TouchableOpacity
              key={chip.id}
              style={styles.chip}
              onPress={() => onScrollToSection(chip.id)}
              accessibilityRole="button"
              accessibilityLabel={t(chip.labelKey)}
            >
              <Icon size={15} color={colors.accent} />
              <CustomText style={styles.chipLabel}>{t(chip.labelKey)}</CustomText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default memo(QuickActions);
