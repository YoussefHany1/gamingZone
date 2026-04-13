import React, {
  memo,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  Switch,
  LayoutAnimation,
  ScrollView,
  Linking,
  InteractionManager,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { databases } from "../lib/appwrite";
import { Query, ID, Models } from "react-native-appwrite";
import Constants from "expo-constants";
import { useNotificationPreferences } from "../hooks/useNotificationPreferences";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
import { adUnitId } from "../constants/config";
import COLORS from "../constants/colors";
import Loading from "../Loading";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

// Config

interface AppExtra { APPWRITE_DATABASE_ID?: string }
const { APPWRITE_DATABASE_ID } = (Constants.expoConfig?.extra ?? {}) as AppExtra;

const ARTICLES_COLLECTION_ID = "articles" as const;
const RSS_COLLECTION_ID = "news_sources" as const;

// Types
export type GamesStackParamList = {
  GameNewsScreen: {
    gameName?: string;
    apiUrl?: string;
    source?: string;
  };
};
type Props = NativeStackScreenProps<GamesStackParamList, "GameNewsScreen">;
interface NewsArticle extends Models.Document {
  title?: string;
  description?: string;
  body?: string;
  link?: string;
  thumbnail?: string;
  pubDate?: string;
}
interface NewsSectionProps {
  gameName: string;
  title: string;
  sourceId: string;
  lang: string;
  defaultExpanded?: boolean;
  rssUrl?: string;
}

// Helpers

const safeId = (input: string): string => {
  if (!input) return "unknown";
  return String(input)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
};

//  NewsItem

interface NewsItemProps {
  item: NewsArticle;
  lang: string;
}

const NewsItem = memo<NewsItemProps>(({ item, lang }) => {
  let imageUrl: string | null = item.thumbnail ?? null;
  if (imageUrl?.startsWith("https://lh3.googleusercontent.com")) {
    imageUrl = null;
  }

  const handlePress = useCallback(() => {
    if (item.link) Linking.openURL(item.link);
  }, [item.link]);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
    >
      <View style={styles.cardContent}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.desc} numberOfLines={3}>
            {item.description ?? item.body ?? ""}
          </Text>
          <Text style={styles.desc} numberOfLines={1}>
            {item.pubDate
              ? new Date(item.pubDate).toLocaleString(
                lang === "ar" ? "ar-EG" : "en-US",
                { dateStyle: "medium", timeStyle: "short" }
              )
              : ""}
          </Text>
        </View>
        {imageUrl && (
          <Image
            recyclingKey={imageUrl}
            source={{ uri: imageUrl }}
            style={styles.cover}
            contentFit="cover"
            transition={500}
            cachePolicy="memory-disk"
            allowDownscaling
          />
        )}
      </View>
    </TouchableOpacity>
  );
});
NewsItem.displayName = "NewsItem";

//  NewsSection

const NewsSection = memo<NewsSectionProps>(({
  gameName,
  title,
  sourceId,
  lang,
  defaultExpanded = true,
  rssUrl,
}) => {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [expanded, setExpanded] = useState<boolean>(defaultExpanded);

  const { preferences, toggleSource, loadingPreferences } =
    useNotificationPreferences();

  const { categorySafe, nameSafe, topicName } = useMemo(() => {
    const cat = safeId(gameName);
    const name = safeId(sourceId || title);
    return { categorySafe: cat, nameSafe: name, topicName: `${cat}_${name}` };
  }, [gameName, sourceId, title]);

  const isEnabled = !!preferences[topicName];

  // Data fetch

  const fetchNews = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await databases.listDocuments(
        APPWRITE_DATABASE_ID ?? "",
        ARTICLES_COLLECTION_ID,
        [
          Query.equal("category", categorySafe),
          Query.equal("language", lang),
          Query.orderDesc("pubDate"),
          Query.limit(40),
        ]
      );
      setNews(response.documents as NewsArticle[]);
    } catch (error) {
      console.error(`[NewsSection] Error fetching news for ${title}:`, error);
    } finally {
      setLoading(false);
    }
  }, [categorySafe, lang, title]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  // Handlers

  const toggleExpand = useCallback((): void => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  }, []);

  const handleToggleSwitch = useCallback(async (): Promise<void> => {
    if (!isEnabled) {
      try {
        const existing = await databases.listDocuments(
          APPWRITE_DATABASE_ID ?? "",
          RSS_COLLECTION_ID,
          [
            Query.equal("category", categorySafe),
            Query.equal("language", lang),
          ]
        );
        if (existing.total === 0 && rssUrl) {
          await databases.createDocument(
            APPWRITE_DATABASE_ID ?? "",
            RSS_COLLECTION_ID,
            ID.unique(),
            { rssUrl, category: categorySafe, name: title, language: lang, isActive: true }
          );
        }
      } catch (error) {
        console.error("[NewsSection] Error adding RSS source:", error);
      }
    }
    toggleSource(categorySafe, nameSafe);
  }, [isEnabled, categorySafe, nameSafe, lang, rssUrl, title, toggleSource]);

  return (
    <View style={[styles.sectionContainer, lang === "ar" ? { direction: "rtl" } : { direction: "ltr" }]}>
      <TouchableOpacity style={styles.categoryHeader} onPress={toggleExpand} activeOpacity={0.7}>
        <View style={styles.categoryHeaderLeft}>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={20}
            color="#779bdd"
            style={styles.chevronIcon}
          />
          <Text style={styles.categoryTitle}>{title}</Text>
        </View>
        <Switch
          trackColor={{ false: "#3e3e3e", true: "#779bdd" }}
          thumbColor="#ffffff"
          onValueChange={handleToggleSwitch}
          value={isEnabled}
          disabled={loadingPreferences}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.listContainer}>
          {loading ? (
            <Loading />
          ) : news.length === 0 ? (
            <Text style={{ color: "gray", textAlign: "center", marginTop: 10 }}>
              {lang === "ar" ? "لا توجد أخبار حالياً" : "No news found."}
            </Text>
          ) : (
            <ScrollView style={{ maxHeight: 250, borderRadius: 8 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
              {news.map((item) => (
                <NewsItem key={item.$id} item={item} lang={lang} />
              ))}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
});
NewsSection.displayName = "NewsSection";

// main

const GameNewsScreen: React.FC<Props> = memo(({ route }) => {
  const currentGame = route.params?.gameName ?? "";
  const legacyApiUrl = route.params?.apiUrl ?? "";
  const sourceLink = route.params?.source ?? "";

  const [showAds, setShowAds] = useState<boolean>(false);
  const { t } = useTranslation();

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => setShowAds(true));
    return () => task.cancel();
  }, []);

  const handleOpenSource = useCallback(() => {
    if (sourceLink) Linking.openURL(sourceLink);
  }, [sourceLink]);

  return (
    <SafeAreaView style={styles.screen} edges={["left", "right"]}>
      <ScrollView style={{ padding: 16 }}>
        <NewsSection
          gameName={currentGame}
          title="English News"
          sourceId="english_news"
          lang="en"
          defaultExpanded
          rssUrl={legacyApiUrl}
        />

        {showAds && (
          <View style={styles.ad}>
            <Text style={styles.adText}>{t("common.ad")}</Text>
            <BannerAd unitId={adUnitId} size={BannerAdSize.MEDIUM_RECTANGLE} />
          </View>
        )}

        {sourceLink && (
          <TouchableOpacity onPress={handleOpenSource} style={{ marginBottom: 10 }}>
            <Text style={styles.sourceText}>{t("games.gamesNews.source")}</Text>
          </TouchableOpacity>
        )}

        <NewsSection
          gameName={currentGame}
          title="الأخبار العربية"
          sourceId="arabic_news"
          lang="ar"
          defaultExpanded
          rssUrl={legacyApiUrl}
        />
      </ScrollView>
    </SafeAreaView>
  );
});

export default GameNewsScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.primary
  },
  sectionContainer: {
    marginVertical: 20,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "rgba(119, 155, 221, 0.2)",
    borderRadius: 8,
  },
  categoryHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginRight: 8,
  },
  chevronIcon: {
    marginRight: 8,
  },
  listContainer: {
    marginTop: 5,
  },
  card: {
    backgroundColor: "#142744",
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    elevation: 2,
    flexDirection: "row",
    flex: 1,
    alignItems: "center",
  },
  cardContent: {
    flexDirection: "row",
    flex: 1,
    alignItems: "center",
  },
  cover: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginLeft: 10,
    backgroundColor: "#2a4d7d", // لون خلفية للصورة أثناء التحميل
  },
  title: {
    color: "white",
    fontSize: 15, // تقليل الحجم قليلاً ليتناسب مع العناوين الطويلة
    fontWeight: "bold",
    marginBottom: 5,
    textAlign: "left",
  },
  desc: {
    fontSize: 12,
    color: "gray",
    marginTop: 4,
    textAlign: "left",
  },
  sourceText: {
    color: "#779bdd",
    textAlign: "center",
    textDecorationLine: "underline",
  },
  ad: {
    alignItems: "center",
    width: "100%",
    marginBottom: 38,
  },
  adText: {
    color: "#fff",
    marginBottom: 10,
  },
});
