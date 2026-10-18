import { useCallback } from "react";
import { Alert, I18nManager } from "react-native";
import { useTranslation } from "react-i18next";
import * as Updates from "expo-updates";
import { storage } from "@/src/lib/storage";
import { resolveLanguageCode, type LanguageCode } from "../lib/languages";
import { logger } from "@/src/lib/logger";

export type UseChangeLanguageResult = {
  /** The language currently applied, narrowed to a selector code. */
  currentLanguage: LanguageCode;
  changeLanguage: (target: LanguageCode) => void;
};

/**
 * Owns switching the app language.
 *
 * Changing text direction needs a reload to take effect, so an RTL flip is
 * confirmed with the user first; a same-direction switch is applied silently.
 */
export function useChangeLanguage(): UseChangeLanguageResult {
  const { i18n, t } = useTranslation();

  const changeLanguage = useCallback(
    (target: LanguageCode): void => {
      // Already selected — nothing to do.
      if (i18n.language === target) return;

      const isRTL = target === "ar";
      const directionChanges = isRTL !== I18nManager.isRTL;

      const applyLanguage = async (): Promise<void> => {
        await i18n.changeLanguage(target);
        storage.set("@language", target);

        if (directionChanges) {
          I18nManager.allowRTL(isRTL);
          I18nManager.forceRTL(isRTL);
          setTimeout(async () => {
            try {
              await Updates.reloadAsync();
            } catch {
              logger.warn("[LanguageSelect] Failed to reload app");
            }
          }, 500);
        }
      };

      if (directionChanges) {
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

  return { currentLanguage: resolveLanguageCode(i18n.language), changeLanguage };
}
