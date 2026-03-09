import React, { useEffect, useState, useCallback, useMemo, memo } from "react";
import {
  View, Text, StyleSheet, ScrollView, Linking, TouchableOpacity,
  InteractionManager, Share, ToastAndroid, ActivityIndicator, Pressable,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { intervalToDuration } from "date-fns";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import COLORS from "../constants/colors";
import { adUnitId } from "../constants/config";

// Types
interface ArticleParams {
  title?: string;
  link?: string;
  thumbnail?: string;
  siteName?: string;
  siteImage?: string;
  pubDate?: string;
  description?: string;
  article?: ArticleParams;
}

type RootParamList = { NewsDetails: ArticleParams };

// Constants

const SHARE_DOMAIN = "https://igdb-api-omega.vercel.app/" as const;

// main
const NewsDetails = memo((): React.ReactElement => {
  const { i18n, t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootParamList, "NewsDetails">>();

  const params  = route.params ?? {};
  const article = (params.article ?? params) as ArticleParams;

  const [showAds, setShowAds] = useState<boolean>(false);
  const currentLang = i18n.language;

  const title       = article.title       ?? "";
  const link        = article.link        ?? "";
  const thumbnail   = article.thumbnail   ?? "";
  const siteName    = article.siteName    ?? "";
  const siteImage   = article.siteImage   ?? "";
  const pubDate     = article.pubDate     ?? "";
  const description = article.description ?? "";

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => setShowAds(true));
    return () => task.cancel();
  }, []);

  // Derived date strings

  const formattedDate = useMemo<string>(() => {
    if (!pubDate) return "";
    try {
      return format(new Date(pubDate), "dd MMMM yyyy - hh:mm a", {
        locale: currentLang === "ar" ? ar : undefined,
      });
    } catch { return ""; }
  }, [pubDate, currentLang]);

  const timeAgo = useMemo<string>(() => {
    if (!pubDate) return "";
    const startDate = new Date(pubDate);
    if (isNaN(startDate.getTime())) return "";
    const { years, months, days, hours, minutes } = intervalToDuration({
      start: startDate,
      end: new Date(),
    });
    if (years)   return `${years} ${t("news.duration.years")}`;
    if (months)  return `${months} ${t("news.duration.months")}`;
    if (days)    return `${days} ${t("news.duration.days")}`;
    if (hours)   return minutes
      ? `${hours}${t("news.duration.hours")} ${minutes}${t("news.duration.minutes")}`
      : `${hours}${t("news.duration.hours")}`;
    return `${minutes ?? 0}${t("news.duration.minutes")}`;
  }, [pubDate, t]);

  // Handlers

  const handleGoBack = useCallback(() => navigation.goBack(), [navigation]);

  const handleOpenLink = useCallback(() => {
    if (link) Linking.openURL(link);
  }, [link]);

  const onShare = useCallback(async (): Promise<void> => {
    try {
      const excerpt = description ? description.substring(0, 200) + "..." : "";
      const longUrl = `${SHARE_DOMAIN}/news-details?title=${encodeURIComponent(title)}&link=${encodeURIComponent(link)}&thumbnail=${encodeURIComponent(thumbnail)}&siteName=${encodeURIComponent(siteName)}&siteImage=${encodeURIComponent(siteImage)}&pubDate=${encodeURIComponent(pubDate)}&description=${encodeURIComponent(excerpt)}`;

      let finalUrl = longUrl;
      try {
        const res = await fetch(`https://is.gd/create.php?format=simple&url=${encodeURIComponent(longUrl)}`);
        if (res.ok) {
          const short = await res.text();
          if (short.startsWith("http")) finalUrl = short;
        } else {
          ToastAndroid.show(t("news.details.shareShortenError"), ToastAndroid.LONG);
        }
      } catch {
        ToastAndroid.show(t("news.details.shareShortenError"), ToastAndroid.LONG);
      }

      await Share.share({ message: `${t("news.details.shareMessage")}${finalUrl}`, url: finalUrl, title });
    } catch (error: unknown) {
      console.warn("[NewsDetails] Share error:", (error as Error).message);
    }
  }, [title, link, thumbnail, siteName, siteImage, pubDate, description, t]);

  return (
    <View style={styles.modalContainer}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={handleGoBack}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <Image
          style={styles.image}
          recyclingKey={thumbnail || ""}
          source={thumbnail
            ? { uri: thumbnail, headers: { Referer: "https://www.saudigamer.com/", "User-Agent": "Mozilla/5.0 (Linux; Android 10)" } }
            : require("../assets/image-not-found.webp")}
          contentFit="cover"
          cachePolicy="memory-disk"
          allowDownscaling
        />

        <View style={styles.content}>
          <Text style={styles.title}>{title}</Text>

          <View style={styles.site}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Image recyclingKey={siteImage || ""} style={styles.siteImage} source={siteImage} contentFit="cover" cachePolicy="memory-disk" allowDownscaling />
              <Text style={styles.siteName}>{siteName}</Text>
            </View>
            <Text style={styles.date}>{timeAgo}</Text>
          </View>

          <View style={styles.site}>
            <Text style={styles.date}>{formattedDate}</Text>
            <TouchableOpacity style={styles.shareButton} onPress={onShare}>
              <Ionicons name="share-social-outline" size={26} color="#fff" />
            </TouchableOpacity>
          </View>

          <Text style={styles.description}>
            {description ? `${description.substring(0, 400)}..` : t("news.details.noDescription")}
          </Text>

          {showAds && (
            <View style={styles.ad}>
              <Text style={styles.adText}>{t("common.ad")}</Text>
              <BannerAd unitId={adUnitId} size={BannerAdSize.MEDIUM_RECTANGLE} />
            </View>
          )}

          <Pressable style={styles.button} android_ripple={{ color: "#779bdd" }} onPress={handleOpenLink}>
            <Ionicons name="open-outline" size={20} color="white" style={{ marginRight: 8 }} />
            <Text style={styles.buttonText}>{t("news.details.readFullArticle")}</Text>
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
    width: 40,
    height: 40,
    top: 40,
    left: 15,
    zIndex: 1000,
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
    paddingBottom: 40,
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
  shareButton: {
    padding: 10,
    borderRadius: 50,
    backgroundColor: COLORS.secondary,
    justifyContent: "center",
    alignItems: "center",
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


