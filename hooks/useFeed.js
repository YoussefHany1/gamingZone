import { useEffect, useMemo } from "react";
import { Query } from "react-native-appwrite";
import { databases, client } from "../lib/appwrite";
import Constants from "expo-constants";
import useCachedData from "./useCachedData";

const { APPWRITE_DATABASE_ID } = Constants.expoConfig.extra;
const ARTICLES_COLLECTION_ID = "articles";

export default function useFeed(category, siteName) {
  // إنشاء مفتاح فريد للكاش
  const cacheKey = useMemo(
    () => `feed_cache_${category || "nocat"}_${siteName || "all"}`,
    [category, siteName],
  );

  // دالة الجلب التي سيمررها للـ Hook
  const fetchArticles = async () => {
    if (!category) return [];

    const queries = [
      Query.orderDesc("pubDate"),
      Query.equal("category", category),
      Query.limit(200),
    ];
    if (siteName) queries.push(Query.equal("siteName", siteName));

    const response = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      ARTICLES_COLLECTION_ID,
      queries,
    );
    return response.documents || [];
  };

  const {
    data: articles,
    isLoading: loading,
    isRefetching,
    error,
    refetch,
    setData,
  } = useCachedData(cacheKey, fetchArticles, [category, siteName]);

  // منطق الـ Realtime (يبقى هنا لأنه خاص بهذا الجزء)
  useEffect(() => {
    if (!category) return;

    const subscription = client.subscribe(
      `databases.${APPWRITE_DATABASE_ID}.collections.${ARTICLES_COLLECTION_ID}.documents`,
      (response) => {
        const isCreateEvent = response.events.some((e) =>
          e.includes(".create"),
        );
        if (!isCreateEvent) return;

        const newDoc = response.payload;
        // التأكد من أن الخبر الجديد يطابق الفلتر الحالي
        const isMatchCategory = newDoc.category === category;
        const isMatchSite = siteName ? newDoc.siteName === siteName : true;

        if (isMatchCategory && isMatchSite) {
          // استخدام setData من الـ Hook لتحديث الحالة والكاش معاً
          const currentArticles = articles || [];
          // منع التكرار
          const exists = currentArticles.some((p) => p.$id === newDoc.$id);
          if (!exists) {
            const updatedList = [newDoc, ...currentArticles].slice(0, 200);
            setData(updatedList); // هذا سيحدث الـ State والـ AsyncStorage تلقائياً
          }
        }
      },
    );

    return () => {
      // تنظيف الاشتراك
      if (typeof subscription === "function") subscription();
      else if (subscription && subscription.unsubscribe)
        subscription.unsubscribe();
    };
  }, [category, siteName, articles, setData]);

  return { articles: articles || [], loading, error, isRefetching, refetch };
}
