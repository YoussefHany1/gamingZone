import React, { memo, useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import Loading from "@/src/Loading";
import ErrorState from "@/src/components/ErrorState";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import LatestNews from "../LatestNews";
import type { GenericNewsRouteProps, RssFeedSource } from "../../types";

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

  const [selected, setSelected] = useState<RssFeedSource | undefined>(feedList[0]);

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
      (!selected || !feedList.find((f) => f.name === selected.name)) &&
      feedList.length > 0
    ) {
      setSelected(feedList[0]);
    }
  }, [feedList, selected]);

  if (selected) {
    return (
      <View style={styles.scene}>
        <LatestNews
          website={selected.name}
          category={categoryKey}
          selectedItem={selected}
          language={selected.language ?? "en"}
          websitesList={feedList}
          onChangeFeed={setSelected}
          enablePagination={true}
          itemsPerPage={10}
          adInterval={5}
          showDropdown={true}
        />
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
