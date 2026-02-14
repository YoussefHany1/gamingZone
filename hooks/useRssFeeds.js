import { useCallback } from "react";
import { Query } from "react-native-appwrite";
import { databases } from "../lib/appwrite";
import Constants from "expo-constants";
import useCachedData from "./useCachedData";

const { APPWRITE_DATABASE_ID } = Constants.expoConfig.extra;
const RSS_COLLECTION_ID = "news_sources";
const CACHE_KEY = "RSS_FEEDS_CACHE";

const useRssFeeds = () => {
  // تعريف دالة الجلب ومعالجة البيانات
  // نستخدم useCallback لضمان عدم إعادة إنشاء الدالة إلا عند الضرورة
  const fetchAndTransformFeeds = useCallback(async () => {
    const response = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      RSS_COLLECTION_ID,
      [Query.limit(100)],
    );

    const documents = response.documents;
    const feeds = {};

    // نفس منطق التحويل الموجود في الكود الأصلي
    documents.forEach((doc) => {
      const category = doc.category;
      if (!feeds[category]) {
        feeds[category] = [];
      }
      feeds[category].push({
        ...doc,
        name: doc.name,
        language: doc.language || "en",
        image: doc.image,
        website: doc.rssUrl || doc.website,
      });
    });

    return feeds; // هذه البيانات التي سيتم تخزينها في الكاش والـ State
  }, []);

  // استخدام الـ Hook الجديد
  const {
    data: rssFeeds,
    isLoading: loading,
    error,
    refetch,
  } = useCachedData(CACHE_KEY, fetchAndTransformFeeds);

  return {
    rssFeeds: rssFeeds || {}, // ضمان إرجاع كائن فارغ بدلاً من null لتجنب الأخطاء في الواجهة
    loading,
    error,
    refetch,
  };
};

export default useRssFeeds;
