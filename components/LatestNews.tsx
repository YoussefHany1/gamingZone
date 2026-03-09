import { useCallback, memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  ToastAndroid,
  ListRenderItemInfo,
} from "react-native";
import { Image } from "expo-image";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
import NetInfo from "@react-native-community/netinfo";
import useFeed from "../hooks/useFeed";
import { intervalToDuration } from "date-fns";
import DropdownPicker from "../components/DropdownPicker";
import SkeletonNewsItem from "../skeleton/SkeletonNewsItem";
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
}

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
    ({ item, index }: ListRenderItemInfo<Article>) => {
      const shouldShowAd = (index + 1) % 10 === 0;

      const dateString = item?.pubDate;
      let timeAgo = "";

      if (dateString) {
        const startDate = new Date(dateString);
        const endDate = new Date();

        if (!isNaN(startDate.getTime())) {
          const duration = intervalToDuration({ start: startDate, end: endDate });
          const { years, months, days, hours, minutes } = duration;

          if (years && years > 0) {
            timeAgo = `${years} ${t("news.duration.years")}`;
          } else if (months && months > 0) {
            timeAgo = `${months} ${t("news.duration.months")}`;
          } else if (days && days > 0) {
            timeAgo = `${days} ${t("news.duration.days")}`;
          } else if (hours && hours > 0) {
            timeAgo =
              minutes && minutes > 0
                ? `${hours}${t("news.duration.hours")} ${minutes}${t("news.duration.minutes")}`
                : `${hours}${t("news.duration.hours")}`;
          } else {
            timeAgo = `${minutes}${t("news.duration.minutes")}`;
          }
        }
      }

      return (
        <View
          style={[
            styles.container,
            language === "ar" ? { direction: "rtl" } : { direction: "ltr" },
          ]}
        >
          <Pressable
            style={styles.NewsContainer}
            android_ripple={{ color: COLORS.secondary }}
            onPress={() => handlePressArticle(item)}
          >
            <View style={styles.textContainer}>
              <Text
                style={[
                  styles.headline,
                  language === "ar" ? { marginLeft: 8 } : { marginRight: 8 },
                ]}
              >
                {item?.title ? item.title.substring(0, 100) : ""}
              </Text>
              {item?.description ? (
                <Text numberOfLines={2} style={styles.par}>
                  {item.description}..
                </Text>
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
                          "User-Agent":
                            "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36",
                        },
                      }
                    : require("../assets/image-not-found.webp")
                }
                contentFit="cover"
                transition={500}
                cachePolicy="memory-disk"
                allowDownscaling={true}
              />
              <Text style={styles.website}>{item.siteName}</Text>
            </View>
          </Pressable>

          {shouldShowAd && (
            <View style={styles.ad}>
              <Text style={styles.adText}>{t("common.ad")}</Text>
              <BannerAd
                key={`ad-${index}`}
                unitId={adUnitId}
                size={BannerAdSize.MEDIUM_RECTANGLE}
              />
            </View>
          )}
        </View>
      );
    },
    [language, website, handlePressArticle, t],
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

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.noDataText}>{t("news.noArticles")}</Text>
    </View>
  );

  if (loading && articles.length === 0) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={{ marginTop: 10 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonNewsItem key={i} language={language} />
          ))}
        </View>
      </View>
    );
  }

  if (error && articles.length === 0) {
    return (
      <Text style={{ color: "white", textAlign: "center", marginTop: 20 }}>
        Error while fetching data, please try again later
      </Text>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
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
        removeClippedSubviews={true}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={10}
        contentContainerStyle={listData.length === 0 ? { flexGrow: 1 } : null}
        ListEmptyComponent={renderEmptyComponent}
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
    fontSize: 28,
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
    fontSize: 15,
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
  },
  timeAgoText: {
    fontSize: 12,
    color: COLORS.secondary,
    marginTop: 5,
    marginRight: 12,
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