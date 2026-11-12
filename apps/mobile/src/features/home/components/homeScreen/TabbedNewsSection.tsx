import React, { memo, useEffect, useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useNewsPlatformFilter } from "@/src/features/news";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import CustomText from "@/src/components/CustomText";
import NewsSection from "./NewsSection";
import type { NewsTabKey, TabbedNewsSectionProps } from "./types";
import SectionTitle from "@/src/components/SectionTitle";

/** Tab metadata per feed key. Labels reuse the translated section names. */
const TAB_DEFS: Record<NewsTabKey, { key: NewsTabKey; labelKey: string }> = {
  news: { key: "news", labelKey: "home.sections.news" },
  reviews: { key: "reviews", labelKey: "home.sections.reviews" },
  esports: { key: "esports", labelKey: "home.sections.esports" },
  hardware: { key: "hardware", labelKey: "home.sections.hardware" },
};

/** Group 1 — the latest news + reviews feeds (above the fold). */
export const NEWS_REVIEWS_TABS: readonly NewsTabKey[] = ["news", "reviews"];
/** Group 2 — the in-depth esports + hardware feeds (further down the page). */
export const ESPORTS_HARDWARE_TABS: readonly NewsTabKey[] = ["esports", "hardware"];

/**
 * A group of news feeds in one tabbed section. Only the active tab mounts,
 * so a feed fetches the first time its tab is opened (cache-backed after
 * that). The quick-action chips preselect a tab through `tabRequest`.
 *
 * Every tab is platform-filtered client-side: articles tagged with the user's
 * profile platform, plus untagged articles, are shown. With no registered
 * platform (or while the profile read resolves, via the filter hook's safety
 * timeout) everything is shown.
 */
function TabbedNewsSection({
  language,
  website,
  tabs,
  tabRequest,
}: TabbedNewsSectionProps): React.ReactElement {
  const { t } = useTranslation();
  const { platform, resolved } = useNewsPlatformFilter();
  const userPlatform = platform === "all" ? undefined : platform;
  const [activeTab, setActiveTab] = useState<NewsTabKey>(tabs[0] ?? "news");
  const isGroup1 = tabs.includes("news") && tabs.includes("reviews");
  // "All platforms" (i.e. the user has no profile platform yet) gets the
  // generic header; a personalised platform keeps the "your news" wording.
  const showGenericHeader = resolved && platform === "all";

  useEffect(() => {
    // Validated against this instance's tabs: a chip request for a tab in
    // the other group is ignored here.
    if (tabRequest && tabs.some((tab) => tab === tabRequest)) {
      setActiveTab(tabRequest as NewsTabKey);
    }
  }, [tabRequest, tabs]);

  const styles = useThemeStyles((c) => ({
    tabBar: {
      flexDirection: "row",
      gap: 22,
      paddingHorizontal: 18,
      marginBottom: 4,
    },
    tab: {
      paddingVertical: 10,
      borderBottomWidth: 2,
      borderBottomColor: "transparent",
    },
    tabActive: {
      borderBottomColor: c.accent,
    },
    tabLabel: {
      color: c.textMuted,
      fontSize: 15,
      fontWeight: "600",
    },
    tabLabelActive: {
      color: c.accentText,
      fontWeight: "800",
    },
  }));

  return (
    <View style={{ marginTop: 20 }}>
      {isGroup1 && (
        <View style={{ marginHorizontal: 18 }}>
          <SectionTitle
            title={
              showGenericHeader
                ? t("news.latestHeaderNoPlatform")
                : t("news.latestHeader")
            }
            subtitle={
              showGenericHeader
                ? t("news.latestSubtitleNoPlatform")
                : t("news.latestSubtitle")
            }
            fontSize={20}
          />
        </View>
      )}
      <View style={styles.tabBar}>
        {tabs.map((key) => {
          const isActive = key === activeTab;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveTab(key)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={t(TAB_DEFS[key].labelKey)}
            >
              <CustomText style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {t(TAB_DEFS[key].labelKey)}
              </CustomText>
            </TouchableOpacity>
          );
        })}
      </View>

      <NewsSection
        category={activeTab}
        language={language}
        website={website}
        showHeaderTitle={false}
        userPlatform={userPlatform}
        feedReady={resolved}
      />
    </View>
  );
}

export default memo(TabbedNewsSection);
