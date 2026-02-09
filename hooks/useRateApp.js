import { useEffect } from "react";
import * as StoreReview from "expo-store-review";
import AsyncStorage from "@react-native-async-storage/async-storage";

const RATE_KEY = "has_rated_app";
const LAUNCH_DATE_KEY = "first_launch_date";

const DAYS_BEFORE_RATING = 3;

const useRateApp = () => {
  useEffect(() => {
    const checkRatingEligibility = async () => {
      try {
        // 1. التأكد هل سبق وعرضنا التقييم؟
        const hasRated = await AsyncStorage.getItem(RATE_KEY);
        if (hasRated === "true") return;

        // 2. جلب تاريخ أول استخدام
        const firstLaunchDate = await AsyncStorage.getItem(LAUNCH_DATE_KEY);
        const now = Date.now();

        if (firstLaunchDate === null) {
          // إذا لم يوجد تاريخ، فهذه أول مرة يفتح فيها التطبيق
          await AsyncStorage.setItem(LAUNCH_DATE_KEY, now.toString());
        } else {
          // 3. حساب الفرق في الأيام
          const diffInMs = now - parseInt(firstLaunchDate);
          const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

          // 4. إذا مرت المدة المحددة (مثلاً 3 أيام)
          if (diffInDays >= DAYS_BEFORE_RATING) {
            // التحقق من دعم الجهاز لميزة التقييم الداخلي
            if (await StoreReview.hasAction()) {
              // طلب التقييم
              await StoreReview.requestReview();

              // حفظ أنه تم عرض التقييم حتى لا يظهر مجدداً
              // ملاحظة: في أندرويد/iOS النظام نفسه يمنع ظهور الرسالة بشكل متكرر مزعج،
              // ولكن هذا الحفظ يضمن عدم محاولة الكود تشغيل الأمر بلا داع.
              await AsyncStorage.setItem(RATE_KEY, "true");
            }
          }
        }
      } catch (error) {
        console.log("Error inside useRateApp:", error);
      }
    };

    checkRatingEligibility();
  }, []);
};

export default useRateApp;
