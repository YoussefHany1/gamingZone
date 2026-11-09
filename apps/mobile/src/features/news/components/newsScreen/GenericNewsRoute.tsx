import React, { memo, useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import Loading from "@/src/Loading";
import ErrorState from "@/src/components/ErrorState";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import LatestNews from "../LatestNews";
import { useNewsPlatformFilter } from "../../hooks/useNewsPlatformFilter";
import {
  ALL_LANGUAGES_NAME,
  ARABIC_SOURCES_NAME,
  ENGLISH_SOURCES_NAME,
  SPANISH_SOURCES_NAME,
  FRENCH_SOURCES_NAME,
  HINDI_SOURCES_NAME,
  PORTUGUESE_SOURCES_NAME,
  SUPPORTED_SOURCE_LANGUAGES,
  allSourcesNameForLanguage,
  languageForSourceName,
  normalizeSourceLanguage,
  isAllSourcesName,
} from "../../lib/allSources";
import type {
  GenericNewsRouteProps,
  LatestNewsProps,
  NewsLanguageFilter,
  RssFeedSource,
} from "../../types";

/** Only News/Reviews get the platform filter (Home and the other tabs don't). */
const PLATFORM_SCOPED_CATEGORIES = new Set(["news", "reviews"]);

type FeedProps = Omit<
  LatestNewsProps,
  "platform" | "showPlatformFilter" | "onPlatformChange" | "onResetPlatform" | "feedReady"
>;

function BaseFeed(props: FeedProps) {
  return <LatestNews {...props} />;
}

/**
 * News/Reviews feed with the platform chip row. Split into its own component so
 * the profile-platform read (and the chips) never runs for the other tabs.
 */
function PlatformAwareFeed(props: FeedProps) {
  const { platform, resolved, setPlatform, resetPlatform } = useNewsPlatformFilter();

  return (
    <LatestNews
      {...props}
      platform={platform === "all" ? undefined : platform}
      showPlatformFilter
      feedReady={resolved}
      onPlatformChange={setPlatform}
      onResetPlatform={resetPlatform}
    />
  );
}

/**
 * One category scene: renders the selected RSS source's feed, or the
 * loading / error / empty states when it can't.
 */
const GenericNewsRoute = memo(function GenericNewsRoute({
  rssFeeds,
  categoryKey,
  loading,
  error,
  refetch,
}: GenericNewsRouteProps) {
  const { i18n, t } = useTranslation();

  const feedList = useMemo<RssFeedSource[]>(() => {
    // `RssSource` (from useRssFeeds) extends Appwrite's Models.Document while
    // LatestNews works with the lighter `RssFeedSource` view-model; they are
    // structurally compatible for every field LatestNews reads.
    const list = (rssFeeds[categoryKey] ?? []) as unknown as RssFeedSource[];
    const appLang = i18n.language.startsWith("pt")
      ? "pt"
      : (i18n.language.split("-")[0] ?? "en");
    const orderedLanguages = [
      appLang,
      ...SUPPORTED_SOURCE_LANGUAGES.filter((lang) => lang !== appLang),
    ];
    return orderedLanguages.flatMap((lang) =>
      list
        .filter((item) => normalizeSourceLanguage(item.language) === lang)
        .sort((a, b) => a.name.localeCompare(b.name, lang === "ar" ? "ar" : "en")),
    );
  }, [rssFeeds, categoryKey, i18n.language]);

  const appLanguage: NewsLanguageFilter = i18n.language.startsWith("pt")
    ? "pt"
    : (SUPPORTED_SOURCE_LANGUAGES as readonly string[]).includes(
        i18n.language.split("-")[0] ?? "",
      )
      ? ((i18n.language.split("-")[0] ?? "en") as NewsLanguageFilter)
      : "en";
  const defaultSourceName =
    allSourcesNameForLanguage(appLanguage as string) ?? ENGLISH_SOURCES_NAME;

  const [selected, setSelected] = useState<RssFeedSource | undefined>(() => {
    if (feedList.length > 0) {
      return {
        name: defaultSourceName,
        image: "",
        language: appLanguage === "all" ? "en" : (appLanguage as any),
      };
    }
    return undefined;
  });

  const styles = useThemeStyles((c) => ({
    scene: {
      flex: 1,
      backgroundColor: c.background,
      alignItems: "center",
      justifyContent: "center",
    },
    noDataText: { color: c.text },
  }));

  useEffect(() => {
    setSelected((prev) => {
      // Migrate legacy all-languages selection to language-scoped all-sources
      if (prev && prev.name === ALL_LANGUAGES_NAME) {
        return {
          name: defaultSourceName,
          image: "",
          language: appLanguage === "all" ? "en" : (appLanguage as any),
        };
      }

      if (prev && !isAllSourcesName(prev.name)) {
        if (!feedList.find((f) => f.name === prev.name)) {
          if (feedList.length > 0) {
            return {
              name: defaultSourceName,
              image: "",
              language: appLanguage === "all" ? "en" : (appLanguage as any),
            };
          }
          return undefined;
        }
        return prev;
      }

      if (!prev && feedList.length > 0) {
        return {
          name: defaultSourceName,
          image: "",
          language: appLanguage === "all" ? "en" : (appLanguage as any),
        };
      }

      if (prev && isAllSourcesName(prev.name) && feedList.length === 0) {
        return undefined;
      }

      return prev;
    });
  }, [appLanguage, defaultSourceName, feedList]);

  if (selected) {
    const isAllSources = isAllSourcesName(selected.name);
    const resolvedLang = languageForSourceName(selected.name);
    const languageFilter: NewsLanguageFilter =
      resolvedLang && resolvedLang !== "all"
        ? (resolvedLang as NewsLanguageFilter)
        : "all";
    const allSourcesLanguage: NewsLanguageFilter =
      languageFilter === "all" ? appLanguage : languageFilter;
    const feedProps: FeedProps = {
      website: isAllSources ? undefined : selected.name,
      category: categoryKey,
      selectedItem: selected,
      language: isAllSources ? allSourcesLanguage : (selected.language ?? "en"),
      websitesList: feedList,
      onChangeFeed: setSelected,
      enablePagination: true,
      itemsPerPage: 10,
      adInterval: 5,
      showDropdown: true,
      ...(isAllSources ? { languageFilter } : {}),
    };

    return (
      <View style={styles.scene}>
        {PLATFORM_SCOPED_CATEGORIES.has(categoryKey) ? (
          <PlatformAwareFeed {...feedProps} />
        ) : (
          <BaseFeed {...feedProps} />
        )}
      </View>
    );
  }
  if (loading && feedList.length === 0) {
    return (
      <View style={styles.scene}>
        <Loading />
      </View>
    );
  }
  if (error && feedList.length === 0) {
    return (
      <View style={styles.scene}>
        <ErrorState
          message={t("news.fetchError")}
          showContactButton={false}
          onRetry={() => refetch(true)}
        />
      </View>
    );
  }
  return (
    <View style={styles.scene}>
      <CustomText style={styles.noDataText}>{t("news.noSources")}</CustomText>
    </View>
  );
});

export default GenericNewsRoute;
