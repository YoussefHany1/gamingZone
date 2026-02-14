import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Linking,
  TouchableOpacity,
  InteractionManager,
  Share,
  ToastAndroid,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { intervalToDuration } from "date-fns";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
import { useEffect, useState } from "react";
import COLORS from "../constants/colors";
import { adUnitId } from "../constants/config";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useNavigation, useRoute } from "@react-navigation/native";

function NewsDetails() {
  const { i18n, t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params || {};
  const article = params.article || params;
  const [showAds, setShowAds] = useState(false);
  const currentLang = i18n.language;

  const title = article.title || "";
  const link = article.link || "";
  const thumbnail = article.thumbnail || "";
  const siteName = article.siteName || "";
  const siteImage = article.siteImage || "";
  const pubDate = article.pubDate || "";
  let description = article.description || "";

  // activate ads after the list loads
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setShowAds(true);
    });
    return () => task.cancel();
  }, []);

  const dateString = article?.pubDate;
  const formattedDate = format(new Date(dateString), "dd MMMM yyyy - hh:mm a", {
    locale: currentLang === "ar" ? ar : undefined,
  });

  let timeAgo = "";
  if (dateString) {
    const startDate = new Date(dateString);
    const endDate = new Date();

    if (!isNaN(startDate)) {
      const duration = intervalToDuration({
        start: startDate,
        end: endDate,
      });

      const { years, months, days, hours, minutes } = duration;

      // analyze duration and set timeAgo string
      if (years > 0) {
        timeAgo = `${years} ${t("news.duration.years")}`; // years
      } else if (months > 0) {
        timeAgo = `${months} ${t("news.duration.months")}`; // months
      } else if (days > 0) {
        timeAgo = `${days} ${t("news.duration.days")}`; // days
      } else if (hours > 0) {
        timeAgo =
          minutes > 0
            ? `${hours}${t("news.duration.hours")} ${minutes}${t(
                "news.duration.minutes",
              )}`
            : `${hours}${t("news.duration.hours")}`;
      } else {
        timeAgo = `${minutes}${t("news.duration.minutes")}`;
      }
    }
  }

  const onShare = async () => {
    try {
      if (!article) {
        ToastAndroid.show(
          t("news.details.shareShortenError"),
          ToastAndroid.LONG,
        );
        return;
      }
      description = article.description
        ? article.description.substring(0, 200) + "..."
        : "";

      const domain = "https://igdb-api-omega.vercel.app/";
      const longUrl = `${domain}/news-details?title=${encodeURIComponent(title)}&link=${encodeURIComponent(link)}&thumbnail=${encodeURIComponent(thumbnail)}&siteName=${encodeURIComponent(siteName)}&siteImage=${encodeURIComponent(siteImage)}&pubDate=${encodeURIComponent(pubDate)}&description=${encodeURIComponent(description)}`;

      let finalUrl = longUrl;
      try {
        const response = await fetch(
          `https://is.gd/create.php?format=simple&url=${encodeURIComponent(longUrl)}`,
        );
        if (response.ok) {
          const shortUrl = await response.text();
          if (shortUrl.startsWith("http")) {
            finalUrl = shortUrl;
          }
        } else {
          console.log("Shortener failed, falling back to long URL");
          ToastAndroid.show(
            t("news.details.shareShortenError"),
            ToastAndroid.LONG,
          );
        }
      } catch (e) {
        console.log("Network error during shortening:", e);
        ToastAndroid.show(
          t("news.details.shareShortenError"),
          ToastAndroid.LONG,
        );
      }

      const message = `${t("news.details.shareMessage")}${finalUrl}`;

      await Share.share({
        message: message,
        url: finalUrl,
        title: title,
      });
    } catch (error) {
      console.log(error.message);
    }
  };

  return (
    <View style={styles.modalContainer}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <Image
          style={styles.image}
          source={
            thumbnail
              ? {
                  uri: thumbnail,
                  headers: {
                    Referer: "https://www.saudigamer.com/",
                    "User-Agent":
                      "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36",
                  },
                }
              : require("../assets/image-not-found.webp")
          }
          contentFit="cover"
          cachePolicy="memory-disk"
        />
        <View style={styles.content}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.site}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Image
                style={styles.siteImage}
                source={siteImage}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
              <Text style={styles.siteName}>{siteName}</Text>
            </View>
            <Text style={styles.date}>{timeAgo}</Text>
          </View>
          <View style={styles.site}>
            <Text style={styles.date}>{formattedDate}</Text>
            {/* Share Button */}
            <TouchableOpacity style={styles.shareButton} onPress={onShare}>
              <Ionicons name="share-social-outline" size={26} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.description}>
            {description &&
            description !== undefined &&
            description !== null &&
            description !== "" ? (
              <Text style={styles.description}>
                {description.substring(0, 400)}..
              </Text>
            ) : (
              <Text style={styles.description}>
                {t("news.details.noDescription")}
              </Text>
            )}
          </View>
          {showAds && (
            <View style={styles.ad}>
              <Text style={styles.adText}>{t("common.ad")}</Text>
              <BannerAd
                unitId={adUnitId}
                size={BannerAdSize.MEDIUM_RECTANGLE}
              />
            </View>
          )}
          <TouchableOpacity
            style={styles.button}
            android_ripple={{ color: "#779bdd" }}
            onPress={() => Linking.openURL(link)}
          >
            <Ionicons
              name="open-outline"
              size={20}
              color="white"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.buttonText}>
              {t("news.details.readFullArticle")}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

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

export default NewsDetails;
