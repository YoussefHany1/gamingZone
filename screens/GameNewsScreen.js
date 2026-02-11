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
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { databases } from "../lib/appwrite";
import { Query, ID } from "react-native-appwrite";
import Constants from "expo-constants";
import { useNotificationPreferences } from "../hooks/useNotificationPreferences";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
import { adUnitId } from "../constants/config";
import Loading from "../Loading";

const { APPWRITE_DATABASE_ID } = Constants.expoConfig.extra;

// تأكد من أن هذا الاسم يطابق اسم الـ Collection الخاصة بالمقالات في Appwrite
const ARTICLES_COLLECTION_ID = "articles";
const RSS_COLLECTION_ID = "news_sources";

// --- دالة مساعدة لإنشاء معرفات آمنة ---
const safeId = (input) => {
  if (!input) return "unknown";
  return String(input)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_\-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
};

const NewsSection = ({
  gameName,
  title,
  sourceId,
  lang,
  defaultExpanded = true,
  rssUrl, // يمكن تمريره إذا أردنا حفظه عند تفعيل التنبيهات
}) => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(defaultExpanded);

  const { preferences, toggleSource, loadingPreferences } =
    useNotificationPreferences();

  // تنظيف الاسم لاستخدامه كـ category في قاعدة البيانات
  const categorySafe = safeId(gameName); // مثال: "league_of_legends"
  const nameSafe = safeId(sourceId || title);
  console.log(categorySafe);
  const topicName = `${categorySafe}_${nameSafe}`;

  const isEnabled = !!preferences[topicName];

  useEffect(() => {
    fetchNews();
  }, [gameName, lang]);

  const fetchNews = async () => {
    try {
      setLoading(true);

      // الحل الثاني: جلب الأخبار من قاعدة بيانات Appwrite مباشرة
      // هذا يعتمد على أن السكريبت الخلفي قد قام بالفعل بجلب الـ RSS وتخزينه
      const response = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        ARTICLES_COLLECTION_ID,
        [
          Query.equal("category", categorySafe), // تصفية حسب اللعبة
          Query.equal("language", lang), // تصفية حسب اللغة (ar أو en)
          Query.orderDesc("pubDate"), // الأحدث أولاً
          Query.limit(40), // جلب آخر 40   خبر
        ],
      );

      setNews(response.documents);
    } catch (error) {
      console.error(`Error fetching news for ${title} from Appwrite:`, error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  const handleToggleSwitch = async () => {
    // إذا كان الزر غير مفعل، وسنقوم بتفعيله الآن -> نحتاج لتسجيل المصدر في السيرفر
    if (!isEnabled) {
      try {
        const existingDocs = await databases.listDocuments(
          APPWRITE_DATABASE_ID,
          RSS_COLLECTION_ID,
          [
            Query.equal("category", categorySafe),
            Query.equal("language", lang),
          ],
        );

        // إذا لم يكن المصدر موجوداً، نقوم بإنشائه ليتمكن السيرفر الخلفي من جدولة الـ RSS
        if (existingDocs.total === 0 && rssUrl) {
          const payload = {
            rssUrl: rssUrl, // الرابط الذي مررناه
            category: categorySafe,
            name: title,
            language: lang,
            isActive: true,
          };

          await databases.createDocument(
            APPWRITE_DATABASE_ID,
            RSS_COLLECTION_ID,
            ID.unique(),
            payload,
          );
          console.log("✅ New RSS Source created in Appwrite via App");
        }
      } catch (error) {
        console.error(
          "❌ Error adding/updating RSS source in Appwrite:",
          error,
        );
      }
    }

    // تفعيل الاشتراك محلياً وفي الإشعارات
    toggleSource(categorySafe, nameSafe);
  };

  return (
    <View
      style={[
        styles.sectionContainer,
        lang === "ar" ? { direction: "rtl" } : { direction: "ltr" },
      ]}
    >
      <TouchableOpacity
        style={styles.categoryHeader}
        onPress={toggleExpand}
        activeOpacity={0.7}
      >
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
          thumbColor={"#ffffff"}
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
            <ScrollView
              style={{ maxHeight: 250, borderRadius: 8 }}
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={false}
            >
              {news.map((item, index) => {
                let imageUrl = item.thumbnail || null;

                if (imageUrl?.startsWith("https://lh3.googleusercontent.com")) {
                  imageUrl = null;
                }
                return (
                  <TouchableOpacity
                    key={item.$id || index.toString()}
                    style={styles.card}
                    onPress={() =>
                      item.link ? Linking.openURL(item.link) : null
                    }
                  >
                    <View style={styles.cardContent}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.title} numberOfLines={2}>
                          {item.title}
                        </Text>
                        {/* عرض الوصف أو الملخص */}
                        <Text style={styles.desc} numberOfLines={3}>
                          {item.description || item.body || ""}
                        </Text>
                        <Text style={styles.desc} numberOfLines={1}>
                          {new Date(item.pubDate).toLocaleString(
                            lang === "ar" ? "ar-EG" : "en-US",
                            {
                              dateStyle: "medium",
                              timeStyle: "short",
                            },
                          )}
                        </Text>
                      </View>
                      {/* عرض الصورة: نستخدم thumbnail الذي يوفره السكريبت الخلفي */}
                      {imageUrl && (
                        <Image
                          source={{ uri: imageUrl }}
                          style={styles.cover}
                          contentFit="cover"
                          transition={500}
                          cachePolicy="memory-disk"
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
};

// --- 2. الشاشة الرئيسية ---
function GameNewsScreen({ route, navigation }) {
  const Currentgame = route.params?.gameName || "";
  // لم نعد بحاجة ملحة لـ apiUrl هنا لأننا نجلب من قاعدة البيانات
  // لكن يمكن استخدامه لإنشاء المصدر أول مرة إذا لزم الأمر
  const legacyApiUrl = route.params?.apiUrl || "";
  const sourceLink = route.params?.source || "";

  const [showAds, setShowAds] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setShowAds(true);
    });

    return () => task.cancel();
  }, []);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#0d1b2a" }}
      edges={["left", "right"]}
    >
      <ScrollView style={{ padding: 16 }}>
        {/* English News Section */}
        <NewsSection
          gameName={Currentgame}
          title="English News"
          sourceId="english_news"
          lang="en"
          defaultExpanded={true}
          rssUrl={legacyApiUrl} // تمرير الرابط احتياطياً
        />

        {showAds && (
          <View style={styles.ad}>
            <Text style={styles.adText}>{t("common.ad")}</Text>
            <BannerAd
              unitId={adUnitId}
              size={BannerAdSize.MEDIUM_RECTANGLE}
              requestOptions={{
                requestNonPersonalizedAdsOnly: true,
              }}
            />
          </View>
        )}

        {/* رابط المصدر الأصلي إن وجد */}
        {sourceLink && (
          <TouchableOpacity
            onPress={() => Linking.openURL(sourceLink)}
            style={{ marginBottom: 10 }}
          >
            <Text style={styles.sourceText}>{t("games.gamesNews.source")}</Text>
          </TouchableOpacity>
        )}

        {/* Arabic News Section */}
        <NewsSection
          gameName={Currentgame}
          title="الأخبار العربية"
          sourceId="arabic_news"
          lang="ar"
          defaultExpanded={true}
          rssUrl={legacyApiUrl}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

export default GameNewsScreen;

const styles = StyleSheet.create({
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
