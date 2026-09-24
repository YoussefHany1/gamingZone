import React, { useState, useEffect, useCallback, memo } from "react";
import CustomText from "@/src/components/CustomText";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  I18nManager,
} from "react-native";
import { runAfterInteractions } from "@/src/utils/runAfterInteractions";
import { useAdsEnabled } from "@/src/hooks/useAdsEnabled";
import { BannerAd, BannerAdSize } from "@/src/components/AdBanner";
import { useTranslation } from "react-i18next";
import * as Updates from "expo-updates";
import { Check } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import COLORS from "@/src/constants/colors";
import { adUnitId } from "@/src/constants/config";
import { storage } from "@/src/lib/storage";

const LANGUAGE_LABELS = {
  en: "English",
  ar: "العربية",
  es: "Español",
  fr: "Français",
  hi: "हिन्दी",
  "pt-BR": "Português (Brasil)",
  "pt-PT": "Português (Portugal)",
};
const LANGUAGE_CODES = Object.keys(LANGUAGE_LABELS) as Array<
  keyof typeof LANGUAGE_LABELS
>;

const LanguageSelect = memo((): React.ReactElement => {
  const { i18n, t } = useTranslation();
  const [showAds, setShowAds] = useState<boolean>(false);
  const adsEnabled = useAdsEnabled();

  useEffect(() => {
    const task = runAfterInteractions(() =>
      setShowAds(true),
    );
    return () => task.cancel();
  }, []);

  const toggleLanguage = useCallback(
    (targetLang: "en" | "ar" | "es" | "fr" | "hi" | "pt-BR" | "pt-PT"): void => {
      const isRTL = targetLang === "ar";
      // Already selected — nothing to do.
      if (i18n.language === targetLang) return;

      const applyLanguage = async (): Promise<void> => {
        await i18n.changeLanguage(targetLang);
        storage.set("@language", targetLang);
        if (isRTL !== I18nManager.isRTL) {
          I18nManager.allowRTL(isRTL);
          I18nManager.forceRTL(isRTL);
          setTimeout(async () => {
            try {
              await Updates.reloadAsync();
            } catch {
              console.warn("[LanguageSelect] Failed to reload app");
            }
          }, 500);
        }
      };

      // Changing language may require an app restart to re-render the UI in
      // the correct direction — confirm before applying.
      if (isRTL !== I18nManager.isRTL) {
        Alert.alert(
          t("settings.languageSelect.confirmTitle"),
          t("settings.languageSelect.confirmMessage"),
          [
            { text: t("common.cancel"), style: "cancel" },
            {
              text: t("common.continue"),
              onPress: () => {
                void applyLanguage();
              },
            },
          ],
        );
      } else {
        void applyLanguage();
      }
    },
    [i18n, t],
  );

  const currentLang = i18n.language.startsWith("ar")
    ? "ar"
    : i18n.language.startsWith("es")
      ? "es"
      : i18n.language.startsWith("fr")
        ? "fr"
        : i18n.language.startsWith("hi")
          ? "hi"
          : i18n.language.startsWith("pt-PT")
            ? "pt-PT"
            : i18n.language.startsWith("pt-BR")
              ? "pt-BR"
              : "en";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.primary }}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {LANGUAGE_CODES.map((lang) => {
          const isRTL = lang === "ar";
          return (
            <TouchableOpacity
              key={lang}
              style={[
                styles.categoryHeader,
                { direction: isRTL ? "rtl" : "ltr" },
              ]}
              onPress={() => toggleLanguage(lang)}
            >
              <View
                style={[
                  styles.categoryHeaderLeft,
                  { direction: isRTL ? "rtl" : "ltr" },
                ]}
              >
                <CustomText
                  style={[
                    styles.categoryTitle,
                    {
                      writingDirection: isRTL ? "rtl" : "ltr",
                      textAlign: isRTL ? "right" : "left",
                    },
                  ]}
                >
                  {LANGUAGE_LABELS[lang]}
                </CustomText>
                {currentLang === lang && <Check size={24} color="#779bdd" />}
              </View>
            </TouchableOpacity>
          );
        })}
        {showAds && adsEnabled && (
          <View style={styles.ad}>
            <CustomText style={styles.adText}>{t("common.ad")}</CustomText>
            <BannerAd unitId={adUnitId} size={BannerAdSize.MEDIUM_RECTANGLE} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
});
LanguageSelect.displayName = "LanguageSelect";
export default LanguageSelect;

const styles = StyleSheet.create({
  container: { padding: 40, paddingBottom: 90 },
  categoryHeader: {
    marginVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "rgba(119, 155, 221, 0.2)",
    borderRadius: 12,
  },
  categoryHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flex: 1,
  },
  chevronIcon: {
    marginRight: 8,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginHorizontal: 8,
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
});
