import React, { useState, useEffect, useCallback, memo } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, InteractionManager, I18nManager,
} from "react-native";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
import { useTranslation } from "react-i18next";
import * as Updates from "expo-updates";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import COLORS from "../constants/colors";
import { adUnitId } from "../constants/config";

const LanguageSelect = memo((): React.ReactElement => {
  const { i18n, t } = useTranslation();
  const [showAds, setShowAds] = useState<boolean>(false);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => setShowAds(true));
    return () => task.cancel();
  }, []);

  const toggleLanguage = useCallback(async (): Promise<void> => {
    const nextLang = i18n.language === "ar" ? "en" : "ar";
    const isRTL = nextLang === "ar";
    await i18n.changeLanguage(nextLang);
    if (isRTL !== I18nManager.isRTL) {
      I18nManager.allowRTL(isRTL);
      I18nManager.forceRTL(isRTL);
      setTimeout(async () => {
        try { await Updates.reloadAsync(); }
        catch { console.warn("[LanguageSelect] Failed to reload app"); }
      }, 500);
    }
  }, [i18n]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.primary }}>
      <ScrollView style={styles.container}>
        {(["en", "ar"] as const).map((lang) => (
          <TouchableOpacity 
            key={lang} 
            style={[styles.categoryHeader, { direction: lang === "en" ? "ltr" : "rtl" }]} 
            onPress={toggleLanguage}
          >
            <View style={[styles.categoryHeaderLeft, { direction: lang === "en" ? "ltr" : "rtl" }]}>
              <Text 
                style={[
                  styles.categoryTitle, 
                  { 
                    writingDirection: lang === "en" ? "ltr" : "rtl",
                    textAlign: lang === "en" ? "left" : "right" 
                  }
                ]}
              >
                {lang === "en" ? "English" : "العربية"}
              </Text>
              {i18n.language === lang && (
                <Ionicons name="checkmark-sharp" size={24} color="#779bdd" />
              )}
            </View>
          </TouchableOpacity>
        ))}
        {showAds && (
          <View style={styles.ad}>
            <Text style={styles.adText}>{t("common.ad")}</Text>
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
  container: { padding: 40 },
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
