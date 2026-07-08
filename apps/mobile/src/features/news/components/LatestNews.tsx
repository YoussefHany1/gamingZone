import {
  useCallback,
  memo,
  useMemo,
  Fragment,
  useState,
  useEffect,
  useRef,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  RefreshControl,
  ToastAndroid,
  InteractionManager,
} from "react-native";
import { FlashList, ListRenderItemInfo } from "@shopify/flash-list";
import { Image } from "expo-image";
import { NativeAdComponent } from "@/src/components/NativeAd";
import { Ionicons } from "@expo/vector-icons";
import NetInfo from "@react-native-community/netinfo";
import useFeed from "../hooks/useFeed";
import { intervalToDuration } from "date-fns";
import DropdownPicker from "./DropdownPicker";
import SkeletonNewsItem from "../skeleton/SkeletonNewsItem";
import ErrorState from "@/src/components/ErrorState";
import { useTranslation } from "react-i18next";
import COLORS from "@/src/constants/colors";
import { useNavigation } from "@react-navigation/native";
import type { Article, NewsItemProps, LatestNewsProps } from "../types";
import { useScrollDirection } from "@/src/hooks/useScrollDirection";

const NewsItem = memo(function NewsItem({
  item,
  index,
  language,
  onPress,
  t,
  adInterval = 8,
  showAds = false,
}: NewsItemProps) {
  const shouldShowAd = showAds && (index + 1) % adInterval === 0;

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
    <View
      style={[
        styles.container,
        language === "ar" ? { direction: "rtl" } : { direction: "ltr" },
      ]}
    >
      <Pressable
        style={styles.NewsContainer}
        android_ripple={{ color: COLORS.secondary }}
        onPress={() => onPress(item)}
      >
        <View style={styles.textContainer}>
          <Text
            numberOfLines={3}
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
                : require("@/assets/image-not-found.webp")
            }
            contentFit="cover"
            cachePolicy="memory-disk"
            allowDownscaling={true}
          />
          <Text style={styles.website}>{item.siteName}</Text>
        </View>
      </Pressable>
      {shouldShowAd && <NativeAdComponent variant="news" language={language} />}
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
  enablePagination = false,
  itemsPerPage = 10,
  adInterval = 8,
}: LatestNewsProps) {
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const listRef = useRef<any>(null);
  const { onScroll } = useScrollDirection();

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [showAds, setShowAds] = useState<boolean>(false);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() =>
      setShowAds(true),
    );
    return () => task.cancel();
  }, []);

  // Reset page when category, website, or language changes
  useEffect(() => {
    setCurrentPage(1);
  }, [category, website, language]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    if (listRef.current) {
      listRef.current.scrollToOffset({ offset: 0, animated: true });
    }
  }, []);

  const feedCategory = category !== undefined ? category : undefined;
  const feedWebsite =
    website !== undefined && website !== null && website !== ""
      ? website
      : undefined;

  const { articles, total, loading, error, refetch } = useFeed(
    feedCategory,
    feedWebsite,
    currentPage,
    itemsPerPage,
    language,
  );

  // Reset page if total items drop below current page range
  useEffect(() => {
    if (currentPage > 1 && (currentPage - 1) * itemsPerPage >= (total || 0)) {
      setCurrentPage(1);
    }
  }, [total, itemsPerPage, currentPage]);

  const listData: Article[] =
    typeof limit === "number" && !enablePagination
      ? (articles as Article[]).slice(0, limit)
      : (articles as Article[]);

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
        adInterval={adInterval}
        showAds={showAds}
      />
    ),
    [language, handlePressArticle, t, adInterval, showAds],
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
    if (loading) return null;

    if (enablePagination) {
      const totalPages = Math.ceil((total || 0) / itemsPerPage);
      if (totalPages <= 1) return null;

      const pageNumbers: number[] = [];
      const maxButtons = 5;
      let startPage = Math.max(1, currentPage - 2);
      let endPage = Math.min(totalPages, startPage + maxButtons - 1);

      if (endPage - startPage + 1 < maxButtons) {
        startPage = Math.max(1, endPage - maxButtons + 1);
      }

      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }

      const isRtl = language === "ar";
      const prevIcon = isRtl ? "chevron-forward" : "chevron-back";
      const nextIcon = isRtl ? "chevron-back" : "chevron-forward";

      return (
        <View style={styles.paginationContainer}>
          <Pressable
            disabled={currentPage === 1}
            style={[
              styles.pageButton,
              currentPage === 1 && styles.disabledPageButton,
            ]}
            onPress={() => handlePageChange(currentPage - 1)}
          >
            <Ionicons name={prevIcon} size={18} color="white" />
          </Pressable>

          {startPage > 1 && (
            <>
              <Pressable
                style={[
                  styles.pageNumberButton,
                  currentPage === 1 && styles.activePageNumberButton,
                ]}
                onPress={() => handlePageChange(1)}
              >
                <Text
                  style={[
                    styles.pageNumberText,
                    currentPage === 1 && styles.activePageNumberText,
                  ]}
                >
                  1
                </Text>
              </Pressable>
              {startPage > 2 && <Text style={styles.ellipsis}>...</Text>}
            </>
          )}

          {pageNumbers.map((page) => (
            <Pressable
              key={page}
              style={[
                styles.pageNumberButton,
                currentPage === page && styles.activePageNumberButton,
              ]}
              onPress={() => handlePageChange(page)}
            >
              <Text
                style={[
                  styles.pageNumberText,
                  currentPage === page && styles.activePageNumberText,
                ]}
              >
                {page}
              </Text>
            </Pressable>
          ))}

          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && (
                <Text style={styles.ellipsis}>...</Text>
              )}
              <Pressable
                style={[
                  styles.pageNumberButton,
                  currentPage === totalPages && styles.activePageNumberButton,
                ]}
                onPress={() => handlePageChange(totalPages)}
              >
                <Text
                  style={[
                    styles.pageNumberText,
                    currentPage === totalPages && styles.activePageNumberText,
                  ]}
                >
                  {totalPages}
                </Text>
              </Pressable>
            </>
          )}

          <Pressable
            disabled={currentPage === totalPages}
            style={[
              styles.pageButton,
              currentPage === totalPages && styles.disabledPageButton,
            ]}
            onPress={() => handlePageChange(currentPage + 1)}
          >
            <Ionicons name={nextIcon} size={18} color="white" />
          </Pressable>
        </View>
      );
    }

    if (!showFooter || listData.length === 0) return null;
    return (
      <View style={styles.footerContainer}>
        <Text style={styles.footerText}>
          {t("news.endOfList") || "End of articles"}
        </Text>
      </View>
    );
  }, [
    loading,
    enablePagination,
    total,
    itemsPerPage,
    currentPage,
    language,
    showFooter,
    listData.length,
    t,
    handlePageChange,
  ]);

  const onRefresh = useCallback(async (): Promise<void> => {
    const state = await NetInfo.fetch();
    if (!state.isConnected) {
      ToastAndroid.show(
        t("common.noInternet") ||
          "No Internet Connection. Showing cached data.",
        ToastAndroid.LONG,
      );
      return;
    }
    refetch(true);
  }, [refetch, t]);

  const renderEmptyComponent = useCallback(
    () => <ErrorState message={t("news.noArticles")} />,
    [t],
  );

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
              <Fragment
                key={item.$id ? `${item.$id}-${index}` : index.toString()}
              >
                {renderItem({ item, index } as any)}
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
        ref={listRef}
        data={listData}
        renderItem={renderItem}
        keyExtractor={(item, index) =>
          item.$id ? `${item.$id}-${index}` : index.toString()
        }
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={onRefresh}
            tintColor={COLORS.secondary}
          />
        }
        contentContainerStyle={
          listData.length === 0
            ? { flexGrow: 1, paddingBottom: 90 }
            : { paddingBottom: 90 }
        }
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
    fontSize: 24,
    fontWeight: "bold",
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 60,
    paddingVertical: 10,
    marginTop: 15,
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
  nativeAd: {
    marginVertical: 24,
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
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
    marginTop: 10,
    marginBottom: 20,
  },
  pageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.button,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 8,
  },
  disabledPageButton: {
    opacity: 0.3,
  },
  pageNumberButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 4,
  },
  activePageNumberButton: {
    backgroundColor: COLORS.secondary,
  },
  pageNumberText: {
    color: COLORS.lightGray,
    fontSize: 14,
    fontWeight: "600",
  },
  activePageNumberText: {
    color: "#ffffff",
    fontWeight: "bold",
  },
  ellipsis: {
    color: COLORS.lightGray,
    fontSize: 16,
    marginHorizontal: 4,
  },
});
