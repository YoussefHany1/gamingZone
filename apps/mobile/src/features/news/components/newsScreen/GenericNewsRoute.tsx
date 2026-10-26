import React, { memo, useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import Loading from "@/src/Loading";
import ErrorState from "@/src/components/ErrorState";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import LatestNews from "../LatestNews";
import { useNewsPlatformFilter } from "../../hooks/useNewsPlatformFilter";
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
    const arList = list
      .filter((item) => item.language === "ar")
      .sort((a, b) => a.name.localeCompare(b.name, "ar"));
    const enList = list
      .filter((item) => item.language !== "ar")
      .sort((a, b) => a.name.localeCompare(b.name, "en"));
    return i18n.language === "ar" ? [...arList, ...enList] : [...enList, ...arList];
  }, [rssFeeds, categoryKey, i18n.language]);

  const [selected, setSelected] = useState<RssFeedSource | undefined>(() => {
    if (feedList.length > 0) {
      return {
        name: "__all__",
        image: "",
        language: feedList[0]?.language ?? "en",
      };
    }
    return undefined;
  });

  // App language drives the default content language for the combined feed.
  // Only "ar" and "en" exist in the articles collection.
  const appLanguage: NewsLanguageFilter = i18n.language.startsWith("ar") ? "ar" : "en";
  const [allSourcesLanguage, setAllSourcesLanguage] =
    useState<NewsLanguageFilter>(appLanguage);

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
    if (
      selected &&
      selected.name !== "__all__" &&
      !feedList.find((f) => f.name === selected.name)
    ) {
      if (feedList.length > 0) {
        setSelected({
          name: "__all__",
          image: "",
          language: feedList[0]?.language ?? "en",
        });
      } else {
        setSelected(undefined);
      }
    } else if (!selected && feedList.length > 0) {
      setSelected({
        name: "__all__",
        image: "",
        language: feedList[0]?.language ?? "en",
      });
    }
  }, [feedList, selected]);

  if (selected) {
    const isAllSources = selected.name === "__all__";
    const feedProps: FeedProps = {
      website: isAllSources ? undefined : selected.name,
      category: categoryKey,
      selectedItem: selected,
      language: isAllSources ? appLanguage : (selected.language ?? "en"),
      websitesList: feedList,
      onChangeFeed: setSelected,
      enablePagination: true,
      itemsPerPage: 10,
      adInterval: 5,
      showDropdown: true,
      ...(isAllSources
        ? {
            showLanguageFilter: true,
            languageFilter: allSourcesLanguage,
            onLanguageChange: setAllSourcesLanguage,
          }
        : {}),
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
