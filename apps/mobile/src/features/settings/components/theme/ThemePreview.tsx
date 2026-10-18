import React, { memo, useMemo } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { LatestNews } from "@/src/features/news";
import type { Article } from "@/src/features/news/types";
import { geometry } from "./geometry";

const PREVIEW_THUMBNAILS = [
  "https://platform.theverge.com/wp-content/uploads/sites/2/2026/10/gta6.jpg?quality=90&strip=all&crop=0%2C0%2C100%2C100&w=750",
  "https://www.reuters.com/resizer/v2/F4VN364ZPZINBOP2IY5H6GFNJA.jpg?auth=825ae9f636bb0b385f79ca589d5b9da16f83c3cecd9fb8e2caed75f127ff901f&width=640&quality=80",
  "https://www.club386.com/wp-content/uploads/2026/10/AMD-Ryzen-Z1-gaming-handheld-696x696.jpg",
];

/**
 * A live sample of the news feed, painted with the palette that is active
 * *right now*, so an appearance change is visible immediately. The articles
 * are fabricated — nothing is fetched.
 */
const ThemePreview = memo((): React.ReactElement => {
  const { t, i18n } = useTranslation();

  const styles = useThemeStyles((c) => ({
    previewFrame: {
      backgroundColor: c.background,
      borderColor: c.border,
      borderWidth: 1,
      height: 370,
    },
  }));

  const mockArticles = useMemo<Article[]>(
    () =>
      ["mock-1", "mock-2", "mock-3"].map(($id, index) => ({
        $id,
        category: "",
        title: t("settings.theme.previewHeadline").substring(0, 100),
        description: `${t("settings.theme.previewSummary")}..`,
        pubDate: new Date(
          Date.now() - (index === 0 ? 2 : 5) * 60 * 60 * 1000,
        ).toISOString(),
        siteName: t("settings.theme.previewSite"),
        thumbnail: PREVIEW_THUMBNAILS[index] || "",
      })),
    [t],
  );

  return (
    <View style={[geometry.previewWrapper, styles.previewFrame]}>
      <View pointerEvents="none">
        <LatestNews
          limit={3}
          language={i18n.language}
          showDropdown={false}
          showHeaderTitle={false}
          showFooter={false}
          scrollEnabled={false}
          websitesList={[]}
          mockData={mockArticles}
        />
      </View>
    </View>
  );
});

ThemePreview.displayName = "ThemePreview";
export default ThemePreview;
