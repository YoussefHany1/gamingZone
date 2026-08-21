import React, { useEffect, useState, useCallback, useMemo, memo } from "react";
import CustomText from "@/src/components/CustomText";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  InteractionManager,
  Share,
  ToastAndroid,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import ImageGallerySkeleton from "../../games/skeleton/gameDetails/ImageGallerySkeleton";
import GameDetailsMetaSkeleton from "../../games/skeleton/gameDetails/GameDetailsMetaSkeleton";
import { useTranslation } from "react-i18next";
import { intervalToDuration } from "date-fns";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { BannerAd, BannerAdSize } from "@/src/components/AdBanner";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import Constants from "expo-constants";
import { databases } from "@/src/lib/appwrite";
import COLORS from "@/src/constants/colors";
import { adUnitId } from "@/src/constants/config";
import { openLink } from "@/src/lib/browser";
import { useScrollDirection } from "@/src/hooks/useScrollDirection";
import type { ArticleParams, RootParamList } from "../types";

// Constants

const SHARE_DOMAIN = "https://gz1.vercel.app" as const;
const { APPWRITE_DATABASE_ID } = (Constants.expoConfig?.extra ?? {}) as {
  APPWRITE_DATABASE_ID?: string;
};
const ARTICLES_COLLECTION_ID = "articles" as const;

// main
const NewsDetails = memo((): React.ReactElement => {
  const { i18n, t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootParamList, "NewsDetails">>();

  const params = route.params ?? {};
  const article = (params.article ?? params) as ArticleParams;

  const [loadingArticle, setLoadingArticle] = useState<boolean>(false);
  const [fetchedArticle, setFetchedArticle] = useState<ArticleParams | null>(null);
  const [showAds, setShowAds] = useState<boolean>(false);
  const [isReady, setIsReady] = useState<boolean>(false);
  const { onScroll } = useScrollDirection();

  const articleId = params.id ?? params.$id ?? article.id ?? article.$id;
  const hasFullDetails = !!(article.title && article.link);

  useEffect(() => {
    if (articleId && !hasFullDetails) {
      let isMounted = true;
      const fetchFromAppwrite = async () => {
        try {
          setLoadingArticle(true);
          const doc = await databases.getDocument(
            APPWRITE_DATABASE_ID ?? "",
            ARTICLES_COLLECTION_ID,
            articleId,
          );
          if (isMounted) {
            setFetchedArticle({
              id: doc.$id,
              $id: doc.$id,
              title: doc.title,
              link: doc.link,
              thumbnail: doc.thumbnail,
              siteName: doc.siteName,
              siteImage: doc.siteImage,
              pubDate: doc.pubDate,
              description: doc.description,
              language: doc.language,
            });
          }
        } catch (err: any) {
          console.error("[NewsDetails] Error fetching article by ID:", err.message);
          ToastAndroid.show(
            t("news.fetchError") || "Error loading news details",
            ToastAndroid.SHORT,
          );
        } finally {
          if (isMounted) {
            setLoadingArticle(false);
          }
        }
      };
      fetchFromAppwrite();
      return () => {
        isMounted = false;
      };
    }
  }, [articleId, hasFullDetails, t]);

  const activeArticle = hasFullDetails ? article : (fetchedArticle ?? {});

  const title = activeArticle.title ?? "";
  const link = activeArticle.link ?? "";
  const thumbnail = activeArticle.thumbnail ?? "";
  const siteName = activeArticle.siteName ?? "";
  const siteImage = activeArticle.siteImage ?? "";
  const pubDate = activeArticle.pubDate ?? "";
  const description = activeArticle.description ?? "";

  const currentLang = activeArticle.language ?? i18n.language;

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setShowAds(true);
      setIsReady(true);
    });
    return () => task.cancel();
  }, []);

  // Derived date strings

  const formattedDate = useMemo<string>(() => {
    if (!pubDate) return "";
    try {
      const options: { locale?: Locale } = {};
      if (currentLang === "ar") options.locale = ar;
      return format(new Date(pubDate), "dd MMMM yyyy - hh:mm a", options);
    } catch {
      return "";
    }
  }, [pubDate, currentLang]);

  const timeAgo = useMemo<string>(() => {
    if (!pubDate) return "";
    const startDate = new Date(pubDate);
    if (isNaN(startDate.getTime())) return "";
    const { years, months, days, hours, minutes } = intervalToDuration({
      start: startDate,
      end: new Date(),
    });
    if (years) return `${years} ${t("news.duration.years")}`;
    if (months) return `${months} ${t("news.duration.months")}`;
    if (days) return `${days} ${t("news.duration.days")}`;
    if (hours)
      return minutes
        ? `${hours}${t("news.duration.hours")} ${minutes}${t("news.duration.minutes")}`
        : `${hours}${t("news.duration.hours")}`;
    return `${minutes ?? 0}${t("news.duration.minutes")}`;
  }, [pubDate, t]);

  // Handlers

  const handleGoBack = useCallback(() => navigation.goBack(), [navigation]);

  const handleOpenLink = useCallback(() => {
    if (link) openLink(link);
  }, [link]);

  const onShare = useCallback(async (): Promise<void> => {
    try {
      // All articles have an Appwrite ID → always generate a clean /news/:id deep link.
      // If somehow no ID exists, fall back to the original article source URL.
      const shareUrl = articleId
        ? `${SHARE_DOMAIN}/news/${articleId}`
        : link;

      let finalUrl = shareUrl;
      try {
        const res = await fetch(
          `https://is.gd/create.php?format=simple&url=${encodeURIComponent(shareUrl)}`,
        );
        if (res.ok) {
          const short = await res.text();
          if (short.startsWith("http")) finalUrl = short;
        } else {
          ToastAndroid.show(t("news.details.shareShortenError"), ToastAndroid.LONG);
        }
      } catch {
        ToastAndroid.show(t("news.details.shareShortenError"), ToastAndroid.LONG);
      }

      await Share.share({
        message: `${t("news.details.shareMessage")}${finalUrl}`,
        url: finalUrl,
        title,
      });
    } catch (error: unknown) {
      console.warn("[NewsDetails] Share error:", (error as Error).message);
    }
  }, [articleId, title, link, t]);

  if (loadingArticle || !isReady) {
    return (
      <View style={styles.modalContainer}>
        <ImageGallerySkeleton />
        <View style={{ padding: 15 }}>
          <GameDetailsMetaSkeleton />
        </View>
      </View>
    );
  }

  return (
    <View
      style={[styles.modalContainer, { direction: currentLang === "ar" ? "rtl" : "ltr" }]}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={handleGoBack}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={onShare}>
          <Ionicons name="share-social-outline" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        <Image
          style={styles.image}
          recyclingKey={thumbnail || ""}
          source={
            thumbnail
              ? {
                  uri: thumbnail,
                  headers: {
                    Referer: "https://www.saudigamer.com/",
                    "User-Agent": "Mozilla/5.0 (Linux; Android 10)",
                  },
                }
              : require("@/assets/image-not-found.webp")
          }
          contentFit="cover"
          cachePolicy="memory-disk"
          allowDownscaling
        />

        <View style={styles.content}>
          <CustomText style={styles.title}>{title}</CustomText>

          <View style={styles.site}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Image
                recyclingKey={siteImage || ""}
                style={styles.siteImage}
                source={siteImage}
                contentFit="cover"
                cachePolicy="memory-disk"
                allowDownscaling
              />
              <CustomText style={styles.siteName}>{siteName}</CustomText>
            </View>
            <CustomText style={styles.date}>{timeAgo}</CustomText>
          </View>

          <View style={styles.site}>
            <CustomText style={styles.date}>{formattedDate}</CustomText>
          </View>
          <CustomText
            style={[
              styles.description,
              { fontFamily: currentLang == "ar" ? "Cairo" : "Inter" },
            ]}
          >
            {description
              ? `${description.substring(0, 400)}..`
              : t("news.details.noDescription")}
          </CustomText>

          {showAds && (
            <View style={styles.ad}>
              <CustomText style={styles.adText}>{t("common.ad")}</CustomText>
              <BannerAd unitId={adUnitId} size={BannerAdSize.MEDIUM_RECTANGLE} />
            </View>
          )}

          <Pressable
            style={styles.button}
            android_ripple={{ color: "#779bdd" }}
            onPress={handleOpenLink}
          >
            <Ionicons
              name="open-outline"
              size={20}
              color="white"
              style={{ marginRight: 8 }}
            />
            <CustomText style={styles.buttonText}>
              {t("news.details.readFullArticle")}
            </CustomText>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
});
NewsDetails.displayName = "NewsDetails";
export default NewsDetails;

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    //   backgroundColor: COLORS.primary
  },
  header: {
    position: "absolute",
    width: "90%",
    height: 40,
    top: 40,
    left: 15,
    right: 15,
    zIndex: 1000,
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.secondary + "90",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
  site: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 15,
  },
  siteImage: {
    width: 40,
    height: 40,
    borderRadius: 50,
    marginRight: 10,
  },
  siteName: {
    color: "white",
    fontSize: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(81, 105, 150, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flex: 1,
  },
  image: {
    width: "100%",
    height: 300,
    resizeMode: "cover",
  },
  content: {
    padding: 15,
    paddingBottom: 90,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "white",
    lineHeight: 32,
    textAlign: "center",
  },
  date: {
    color: "white",
    marginVertical: 20,
  },
  timeAgoText: {
    fontSize: 12,
    color: COLORS.secondary,
    marginTop: 5,
    marginRight: 12,
  },
  description: {
    fontSize: 16,
    color: "#b7becb",
    lineHeight: 26,
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
  button: {
    backgroundColor: COLORS.secondary,
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 20,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});
