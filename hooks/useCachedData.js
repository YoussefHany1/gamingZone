import { useState, useEffect, useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";

export default function useCachedData(key, fetchFunction, dependencies = []) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // للتحميل الأولي (شاشة بيضاء أو Skeleton)
  const [isRefetching, setIsRefetching] = useState(false); // للتحديث في الخلفية
  const [error, setError] = useState(null);

  // نستخدم useRef لتخزين البيانات الحالية للمقارنة دون تسبب في render
  const currentDataRef = useRef(null);

  const loadData = useCallback(async () => {
    try {
      setIsRefetching(true);
      setError(null);

      // 1. محاولة قراءة الكاش أولاً (فقط إذا لم يكن لدينا بيانات في الـ State)
      if (!data) {
        const cached = await AsyncStorage.getItem(key);
        if (cached) {
          const parsed = JSON.parse(cached);
          setData(parsed);
          currentDataRef.current = parsed;
          setIsLoading(false); // إيقاف التحميل الأولي لأننا وجدنا بيانات
        }
      }

      // 2. التحقق من الاتصال بالإنترنت
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        setIsLoading(false);
        setIsRefetching(false);
        return;
      }

      // 3. جلب البيانات الجديدة من المصدر (Appwrite مثلاً)
      const freshData = await fetchFunction();

      // 4. مقارنة البيانات وتحديثها فقط إذا تغيرت (تجنب الـ Re-renders)
      // نستخدم JSON.stringify للمقارنة البسيطة (يمكنك استخدام lodash.isEqual للأداء الأفضل مع البيانات الضخمة)
      const isDataDifferent =
        JSON.stringify(freshData) !== JSON.stringify(currentDataRef.current);

      if (isDataDifferent) {
        setData(freshData);
        currentDataRef.current = freshData;
        await AsyncStorage.setItem(key, JSON.stringify(freshData));
      }
    } catch (err) {
      console.error(`Error in useCachedData for key: ${key}`, err);
      setError(err);
    } finally {
      setIsLoading(false);
      setIsRefetching(false);
    }
  }, [key, ...dependencies]); // إعادة إنشاء الدالة عند تغير المفتاح أو الاعتماديات

  // تنفيذ الدالة عند بدء التشغيل أو تغير الـ dependencies
  useEffect(() => {
    loadData();
  }, [loadData]);

  // دالة لتحديث البيانات يدوياً (مثلاً عند وصول حدث Realtime)
  const updateLocalData = useCallback(
    async (newData) => {
      setData(newData);
      currentDataRef.current = newData;
      await AsyncStorage.setItem(key, JSON.stringify(newData));
    },
    [key],
  );

  return {
    data,
    isLoading,
    isRefetching,
    error,
    refetch: loadData,
    setData: updateLocalData,
  };
}
