import React, { memo } from "react";
import { View, Switch, TouchableOpacity } from "react-native";
import type { ImageStyle } from "react-native";
import { Image } from "expo-image";
import { ChevronDown, ChevronRight } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import NotificationService from "@/src/services/notificationService";
import { groupSourcesByLanguage } from "../../lib/notificationGroups";
import type { NotificationCategorySectionProps } from "./types";

const GROUP_TITLE_KEYS = {
  ar: "news.dropdown.arabicSources",
  en: "news.dropdown.englishSources",
} as const;

/**
 * One collapsible news category. Each source is a topic subscription; the
 * sources are listed under an Arabic/English heading, with the heading for the
 * app's own language first.
 *
 * Renders nothing when the category has no sources, so no empty accordion is
 * left behind.
 */
const NotificationCategorySection = memo(
  ({
    category,
    title,
    sources,
    preferences,
    isExpanded,
    onToggleExpansion,
    onToggleSource,
  }: NotificationCategorySectionProps): React.ReactElement | null => {
    const colors = useThemeColors();
    const { t, i18n } = useTranslation();

    const styles = useThemeStyles((c) => ({
      categorySection: {
        marginBottom: 20,
        backgroundColor: "rgba(119, 155, 221, 0.1)",
        borderRadius: 12,
        overflow: "hidden",
      },
      categoryHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 16,
        backgroundColor: c.surface,
      },
      categoryHeaderLeft: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
      },
      chevronIcon: {
        marginRight: 8,
      },
      categoryTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: c.text,
        marginRight: 8,
      },
      sourceCount: {
        fontSize: 14,
        color: c.textMuted,
      },
      sourcesList: {
        paddingVertical: 8,
      },
      groupHeaderContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: c.background,
      },
      groupHeaderText: {
        color: c.textSubtle,
        fontSize: 13,
        fontWeight: "bold",
        textTransform: "uppercase",
      },
      sourceItem: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(119, 155, 221, 0.1)",
      },
      sourceInfo: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
      },
      sourceIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        marginRight: 12,
      },
      sourceName: {
        fontSize: 16,
        color: c.text,
        fontWeight: "500",
      },
    }));

    if (sources.length === 0) return null;

    const groups = groupSourcesByLanguage(sources, i18n.language.startsWith("en"));

    return (
      <View style={styles.categorySection}>
        <TouchableOpacity
          style={styles.categoryHeader}
          onPress={() => onToggleExpansion(category)}
          activeOpacity={0.7}
        >
          <View style={styles.categoryHeaderLeft}>
            {isExpanded ? (
              <ChevronDown size={20} color={colors.accent} style={styles.chevronIcon} />
            ) : (
              <ChevronRight size={20} color={colors.accent} style={styles.chevronIcon} />
            )}
            <CustomText style={styles.categoryTitle}>{title}</CustomText>
            <CustomText style={styles.sourceCount}>({sources.length})</CustomText>
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.sourcesList}>
            {groups.map((group) => (
              <View key={`${category}-${group.language}`}>
                <View style={styles.groupHeaderContainer}>
                  <CustomText style={styles.groupHeaderText}>
                    {t(GROUP_TITLE_KEYS[group.language])}
                  </CustomText>
                </View>

                {group.data.map((source) => {
                  const topicId = NotificationService.getTopicName(category, source.name);
                  const isEnabled = preferences[topicId] ?? false;

                  return (
                    <View key={`${category}-${source.$id}`} style={styles.sourceItem}>
                      <View style={styles.sourceInfo}>
                        <Image
                          source={source.image ?? null}
                          style={styles.sourceIcon as ImageStyle}
                        />
                        <CustomText style={styles.sourceName}>{source.name}</CustomText>
                      </View>
                      <Switch
                        value={isEnabled}
                        onValueChange={() => {
                          void onToggleSource(category, source.name);
                        }}
                        trackColor={{ false: "#3e3e3e", true: colors.textMuted }}
                        thumbColor={isEnabled ? colors.text : "#f4f3f4"}
                      />
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        )}
      </View>
    );
  },
);

NotificationCategorySection.displayName = "NotificationCategorySection";
export default NotificationCategorySection;
