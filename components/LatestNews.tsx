import { useCallback, memo, useMemo, Fragment } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  RefreshControl,
  ToastAndroid,
  ListRenderItemInfo,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Image } from "expo-image";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
import NetInfo from "@react-native-community/netinfo";
import useFeed from "../hooks/useFeed";
import { intervalToDuration } from "date-fns";
import DropdownPicker from "../components/DropdownPicker";
import SkeletonNewsItem from "../skeleton/SkeletonNewsItem";
import ErrorState from "./ErrorState";
import { useTranslation } from "react-i18next";
import COLORS from "../constants/colors";
import { adUnitId } from "../constants/config";
import { useNavigation } from "@react-navigation/native";
import { RssFeedSource, Article } from "./types";

interface LatestNewsProps {
  limit?: number;
  language?: string;
  category?: string;
  website?: string;
  selectedItem?: RssFeedSource;
  onChangeFeed?: (item: RssFeedSource) => void;
  showDropdown?: boolean;
  websitesList?: RssFeedSource[];
  showFooter?: boolean;
  scrollEnabled?: boolean;
}

// Memoized row component
interface NewsItemProps {
  item: Article;
  index: number;
  language?: string;
  onPress: (item: Article) => void;
  t: (key: string, opts?: object) => string;
}

const NewsItem = memo(function NewsItem({ item, index, language, onPress, t }: NewsItemProps) {
  const shouldShowAd = (index + 1) % 8 === 0;

  const timeAgo = useMemo(() => {
    const dateString = item?.pubDate;
    if (!dateString) return "";
    const startDate = new Date(dateString);
    if (isNaN(startDate.getTime())) return "";
    const duration = intervalToDuration({ start: startDate, end: new Date() });
    const { years, months, days, hours, minutes } = duration;
    if (years && years > 0) return `${years} ${t("news.duration.years")}`;
    if (months && months > 0) return `${months} ${t("news.duration.months")}`;
    if (days && days > 0) return `${days} ${t("news.duration.days")}`;
    if (hours && hours > 0)
      return minutes && minutes > 0
        ? `${hours}${t("news.duration.hours")} ${minutes}${t("news.duration.minutes")}`
        : `${hours}${t("news.duration.hours")}`;
    return `${minutes}${t("news.duration.minutes")}`;
  }, [item?.pubDate, t]);

  return (
    <View style={[styles.container, language === "ar" ? { direction: "rtl" } : { direction: "ltr" }]}>
      <Pressable
        style={styles.NewsContainer}
        android_ripple={{ color: COLORS.secondary }}
        onPress={() => onPress(item)}
      >
        <View style={styles.textContainer}>
          <Text numberOfLines={3} style={[styles.headline, language === "ar" ? { marginLeft: 8 } : { marginRight: 8 }]}>
            {item?.title ? item.title.substring(0, 100) : ""}
          </Text>
          {item?.description ? (
            <Text numberOfLines={2} style={styles.par}>{item.description}..</Text>
          ) : null}
          <Text style={styles.timeAgoText}>{timeAgo}</Text>
        </View>
        <View>
          <Image
            style={styles.thumbnail}
            recyclingKey={String(item?.id ?? item?.thumbnail)}
            source={
              item?.thumbnail
                ? {
                  uri: item.thumbnail,
                  headers: {
                    Referer: "https://www.saudigamer.com/",
                    "User-Agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36",
                  },
                }
                : require("../assets/image-not-found.webp")
            }
            contentFit="cover"

            cachePolicy="memory-disk"
            allowDownscaling={true}
          />
          <Text style={styles.website}>{item.siteName}</Text>
        </View>
      </Pressable>
      {shouldShowAd && (
        <View style={styles.ad}>
          <Text style={styles.adText}>{t("common.ad")}</Text>
          <BannerAd key={`ad-${index}`} unitId={adUnitId} size={BannerAdSize.MEDIUM_RECTANGLE} />
        </View>
      )}
    </View>
  );
});

// Main component
function LatestNews({
  limit,
  language,
  category,
  website,
  selectedItem,
  onChangeFeed,
  showDropdown,
  websitesList,
  showFooter = true,
  scrollEnabled = true,
}: LatestNewsProps) {
  const navigation = useNavigation<any>();
  const { t } = useTranslation();

  const feedCategory = category !== undefined ? category : undefined;
  const feedWebsite =
    website !== undefined && website !== null && website !== ""
      ? website
      : undefined;

  const { articles, loading, error, refetch } = useFeed(
    feedCategory,
    feedWebsite,
  );

  let filteredArticles = articles as Article[];
  if ((!websitesList || websitesList.length === 0) && language) {
    filteredArticles = (articles as Article[]).filter((item: Article) => item.language === language);
  }

  const listData: Article[] =
    typeof limit === "number"
      ? filteredArticles.slice(0, limit)
      : filteredArticles;

  // Navigate to the article detail screen
  const handlePressArticle = useCallback(
    (item: Article): void => {
      navigation.navigate("NewsDetails", { article: item });
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<Article>) => (
      <NewsItem
        item={item}
        index={index}
        language={language}
        onPress={handlePressArticle}
        t={t as (key: string, opts?: object) => string}
      />
    ),
    [language, handlePressArticle, t],
  );

  const renderHeader = useCallback(() => {
    const safeCategory = category ? String(category).toLowerCase() : "";
    const translatedCategory = safeCategory
      ? t(`news.tabs.${safeCategory}`)
      : "";
    return (
      <>
        <Text style={styles.header}>
          {t("news.latestHeader", { category: translatedCategory })}
        </Text>
        {showDropdown !== false && (
          <DropdownPicker
            category={category ?? ""}
            value={selectedItem}
            websites={websitesList}
            onChange={(item) => onChangeFeed?.(item)}
          />
        )}
      </>
    );
  }, [category, t, showDropdown, selectedItem, websitesList, onChangeFeed]);

  const renderFooter = useCallback(() => {
    if (!showFooter || loading || listData.length === 0) return null;
    return (
      <View style={styles.footerContainer}>
        <Text style={styles.footerText}>
          {t("news.endOfList") || "End of articles"}
        </Text>
      </View>
    );
  }, [loading, listData.length, t, showFooter]);

  const onRefresh = useCallback(async (): Promise<void> => {
    const state = await NetInfo.fetch();
    if (!state.isConnected) {
      ToastAndroid.show(
        t("common.noInternet") || "No Internet Connection. Showing cached data.",
        ToastAndroid.LONG,
      );
      return;
    }
    refetch();
  }, [refetch, t]);

  const renderEmptyComponent = useCallback(() => (
    <ErrorState message={t("news.noArticles")} />
  ), [t]);

  if (loading && articles.length === 0) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={{ marginTop: 10 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonNewsItem key={i} language={language} />
          ))}
        </View>
      </View>
    );
  }

  if (error && articles.length === 0) {
    return <ErrorState message={t("news.fetchError")} />;
  }

  if (scrollEnabled === false) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        {listData.length === 0 ? (
          renderEmptyComponent()
        ) : (
          <View>
            {listData.map((item, index) => (
              <Fragment key={item.$id ? `${item.$id}-${index}` : index.toString()}>
                {renderItem({ item, index, separators: {} as any })}
              </Fragment>
            ))}
          </View>
        )}
        {renderFooter()}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlashList
        data={listData}
        renderItem={renderItem}
        keyExtractor={(item, index) =>
          item.$id ? `${item.$id}-${index}` : index.toString()
        }
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={onRefresh}
            tintColor={COLORS.secondary}
          />
        }
        contentContainerStyle={listData.length === 0 ? { flexGrow: 1 } : null}
        ListEmptyComponent={renderEmptyComponent}
        estimatedItemSize={140}
      />
    </View>
  );
}

export default memo(LatestNews);

const styles = StyleSheet.create({
  container: {},
  header: {
    textAlign: "center",
    alignSelf: "center",
    fontSize: 26,
    fontWeight: "bold",
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 80,
    paddingVertical: 10,
    marginVertical: 20,
    borderRadius: 16,
    color: "white",
  },
  NewsContainer: {
    alignItems: "center",
    alignSelf: "center",
    flexDirection: "row",
    borderRadius: 16,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#4a5565",
  },
  textContainer: {
    width: "65%",
  },
  headline: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 12,
    color: "white",
  },
  par: {
    fontSize: 12,
    color: "#779bdd",
    marginRight: 12,
  },
  thumbnail: {
    width: 135,
    height: 100,
    borderRadius: 16,
    backgroundColor: COLORS.secondary,
  },
  website: {
    position: "absolute",
    bottom: 5,
    left: 15,
    fontSize: 10,
    marginTop: 8,
    color: "white",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 7,
    borderRadius: 6,
  },
  ad: {
    alignItems: "center",
    width: "100%",
    marginVertical: 55,
  },
  adText: {
    color: "#fff",
    marginBottom: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  noDataText: {
    color: "white",
    textAlign: "center",
    borderRadius: 8,
    marginBottom: 20,
  },
  timeAgoText: {
    fontSize: 12,
    color: COLORS.secondary,
    marginTop: 5,
    marginRight: 12,
  },
  errorContainer: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  errorText: {
    color: "white",
    textAlign: "center",
    marginBottom: 15,
    fontSize: 16,
  },
  contactButton: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  contactButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
  footerContainer: {
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  footerText: {
    color: "#779bdd",
    fontSize: 14,
    fontStyle: "italic",
  },
});