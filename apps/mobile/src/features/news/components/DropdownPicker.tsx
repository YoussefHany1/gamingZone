import CustomText from "@/src/components/CustomText";
import type { SectionListData } from "react-native";
import { View, TouchableOpacity, Modal, SectionList, ToastAndroid } from "react-native";
import AppImage from "@/src/components/AppImage";
import { Check, ChevronDown } from "lucide-react-native";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { openLink } from "@/src/lib/browser";
import { useNotificationPreferences } from "@/src/hooks/useNotificationPreferences";
import auth from "@react-native-firebase/auth";
import NotificationService from "@/src/services/notificationService";
import { useState, memo, useMemo, useCallback } from "react";
import SkeletonDropdown from "../skeleton/SkeletonDropdown";
import { useTranslation } from "react-i18next";
import NetInfo from "@react-native-community/netinfo";
import SiteDescription from "./SiteDescription";
import {
  ALL_LANGUAGES_NAME,
  ALL_SOURCES_NAME,
  ARABIC_SOURCES_NAME,
  ENGLISH_SOURCES_NAME,
  SPANISH_SOURCES_NAME,
  FRENCH_SOURCES_NAME,
  HINDI_SOURCES_NAME,
  PORTUGUESE_SOURCES_NAME,
  SUPPORTED_SOURCE_LANGUAGES,
  allSourcesNameForLanguage,
  normalizeSourceLanguage,
  isAllSourcesName,
} from "../lib/allSources";
import type { DropdownPickerProps, SectionData, RssFeedSource } from "../types";

const DropdownPicker: React.FC<DropdownPickerProps> = (props) => {
  const colors = useThemeColors();
  const styles = useThemeStyles((c) => ({
    wrapper: {
      width: "100%",
      alignItems: "center",
      paddingBottom: 20,
      marginTop: 20,
    },
    pickerButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.textMuted,
      borderRadius: 8,
      paddingHorizontal: 15,
      paddingVertical: 12,
      width: "60%",
      justifyContent: "space-between",
    },
    pickerButtonText: {
      color: c.text,
      fontSize: 16,
      flex: 1,
      marginHorizontal: 10,
      textAlign: "center",
    },
    avatar: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: c.accent,
    },

    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.7)",
      justifyContent: "center",
      alignItems: "center",
    },
    modalContent: {
      width: "80%",
      maxHeight: "60%",
      backgroundColor: c.backgroundDeep,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: c.border,
    },
    modalTitle: {
      color: c.text,
      fontSize: 22,
      fontWeight: "bold",
      marginBottom: 15,
      textAlign: "center",
    },
    modalItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 14,
      borderWidth: 0,
      padding: 10,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    modalItemSelected: {
      backgroundColor: c.accentBorder,
      borderBottomColor: "transparent",
      borderRadius: 8,
    },
    modalItemLogo: {
      width: 25,
      height: 25,
      borderRadius: 50,
      marginRight: 10,
      backgroundColor: c.accent,
    },
    modalItemText: {
      color: c.text,
      fontSize: 16,
      // textAlign: "left",
    },
    closeButton: {
      marginTop: 15,
      alignItems: "center",
      padding: 10,
      backgroundColor: c.accent,
      borderRadius: 8,
    },
    closeButtonText: {
      color: c.text,
      fontSize: 18,
      fontWeight: "bold",
    },
    sectionHeader: {
      backgroundColor: c.backgroundDeep,
      paddingVertical: 12,
      paddingHorizontal: 5,
    },
    sectionHeaderText: {
      color: c.textSubtle,
      fontSize: 14,
      fontWeight: "bold",
      textTransform: "uppercase",
    },
  }));

  const { t, i18n } = useTranslation();
  const { preferences, toggleSource } = useNotificationPreferences();
  const [modalVisible, setModalVisible] = useState<boolean>(false);

  const category = props.category.toLowerCase();
  // Memoised: the `?? []` fallback is a fresh array each render, which would
  // otherwise invalidate the `sections` memo below on every render.
  // Filters out inactive sources (isActive === false).
  const websites: RssFeedSource[] = useMemo(
    () =>
      (props.websites ?? []).filter(
        (item) => item.isActive !== false && (item.isActive as unknown) !== "false",
      ),
    [props.websites],
  );
  const selectedItem = props.value;

  // Synthetic "all sources" entry for every supported language.
  const allSourcesByLanguage: Record<string, RssFeedSource> = useMemo(() => {
    const entries: Record<string, RssFeedSource> = {};
    for (const lang of SUPPORTED_SOURCE_LANGUAGES) {
      const name = allSourcesNameForLanguage(lang);
      if (!name) continue;
      entries[lang] = { name, image: "", language: lang as RssFeedSource["language"] };
    }
    return entries;
  }, []);

  const getItemName = useCallback(
    (item: RssFeedSource): string => {
      switch (item.name) {
        case ARABIC_SOURCES_NAME:
        case ENGLISH_SOURCES_NAME:
        case SPANISH_SOURCES_NAME:
        case FRENCH_SOURCES_NAME:
        case HINDI_SOURCES_NAME:
        case PORTUGUESE_SOURCES_NAME:
          return t("news.dropdown.allSources");
        case ALL_SOURCES_NAME:
        case ALL_LANGUAGES_NAME:
          return t("news.dropdown.allSources");
        default:
          return item.name;
      }
    },
    [t],
  );

  // Title key for each language's section.
  const sectionTitleForLanguage = useCallback(
    (lang: string): string => {
      switch (lang) {
        case "ar":
          return t("news.dropdown.arabicSources");
        case "en":
          return t("news.dropdown.englishSources");
        case "es":
          return t("news.dropdown.spanishSources");
        case "fr":
          return t("news.dropdown.frenchSources");
        case "hi":
          return t("news.dropdown.hindiSources");
        case "pt":
          return t("news.dropdown.portugueseSources");
        default:
          return lang.toUpperCase();
      }
    },
    [t],
  );

  // Build section list grouped by language, ordered with the current app
  // language first.
  const sections: SectionData[] = useMemo(() => {
    const normalizedAppLang = i18n.language.startsWith("pt")
      ? "pt"
      : (i18n.language.split("-")[0] ?? "en");
    const appLang = (SUPPORTED_SOURCE_LANGUAGES as readonly string[]).includes(normalizedAppLang)
      ? normalizedAppLang
      : "en";
    const orderedLanguages = [
      appLang,
      ...SUPPORTED_SOURCE_LANGUAGES.filter((lang) => lang !== appLang),
    ];

    const result: SectionData[] = [];
    for (const lang of orderedLanguages) {
      const allSource = allSourcesByLanguage[lang];
      const sites: RssFeedSource[] = [
        ...(allSource ? [allSource] : []),
        ...websites.filter(
          (item) => normalizeSourceLanguage(item.language) === lang,
        ),
      ];
      result.push({
        title: sectionTitleForLanguage(lang),
        data: sites,
      });
    }

    return result;
  }, [allSourcesByLanguage, websites, i18n.language, sectionTitleForLanguage]);

  const handleToggleNotification = async (): Promise<void> => {
    const currentUser = auth().currentUser;
    if (!currentUser || currentUser.isAnonymous) {
      ToastAndroid.show(t("common.loginRequired"), ToastAndroid.LONG);
      return;
    }
    const state = await NetInfo.fetch();
    if (!state.isConnected) {
      ToastAndroid.show(
        t("common.noInternet") || "No Internet Connection",
        ToastAndroid.LONG,
      );
      return;
    }
    if (isAllSources || !selectedItem) return;
    toggleSource(category, selectedItem.name);
  };

  const handleVisitSite = async (url?: string): Promise<void> => {
    if (!url) return;
    const state = await NetInfo.fetch();
    if (!state.isConnected) {
      ToastAndroid.show(
        t("common.noInternet") || "No Internet Connection",
        ToastAndroid.LONG,
      );
      return;
    }
    openLink(url);
  };

  const isAllSources = isAllSourcesName(selectedItem?.name);

  if (websites.length === 0 || !selectedItem) {
    return <SkeletonDropdown />;
  }

  const handleSelect = (item: RssFeedSource): void => {
    props.onChange?.(item);
    setModalVisible(false);
  };

  const notifTopic = NotificationService.getTopicName(category, selectedItem.name);
  const isNotifEnabled: boolean =
    isAllSources || !notifTopic ? false : (preferences[notifTopic] ?? false);

  return (
    <View style={styles.wrapper}>
      {/* Dropdown trigger */}
      <TouchableOpacity
        style={styles.pickerButton}
        activeOpacity={0.7}
        onPress={() => setModalVisible(true)}
      >
        {selectedItem?.image ? (
          <AppImage
            recyclingKey={String(selectedItem.image)}
            source={selectedItem.image}
            style={styles.avatar}
            contentFit="cover"
            cachePolicy="memory-disk"
            allowDownscaling={true}
          />
        ) : null}

        <CustomText style={styles.pickerButtonText} numberOfLines={1}>
          {selectedItem ? getItemName(selectedItem) : t("news.dropdown.selectSource")}
        </CustomText>

        <ChevronDown size={20} color={colors.text} />
      </TouchableOpacity>

      {/* Site description card */}
      {!isAllSources && (
        <SiteDescription
          selectedItem={selectedItem}
          isNotifEnabled={isNotifEnabled}
          onVisitSite={handleVisitSite}
          onToggleNotification={handleToggleNotification}
        />
      )}

      {/* Selection modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <CustomText style={styles.modalTitle}>
              {t("news.dropdown.selectSource")}
            </CustomText>
            <SectionList<RssFeedSource, SectionData>
              sections={sections}
              keyExtractor={(item) => item.name}
              stickySectionHeadersEnabled={false}
              renderSectionHeader={({
                section: { title },
              }: {
                section: SectionListData<RssFeedSource, SectionData>;
              }) => (
                <View style={styles.sectionHeader}>
                  <CustomText style={styles.sectionHeaderText}>{title}</CustomText>
                </View>
              )}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    selectedItem?.name === item.name && styles.modalItemSelected,
                  ]}
                  onPress={() => handleSelect(item)}
                >
                  <View style={{ alignItems: "center", flexDirection: "row" }}>
                    {isAllSourcesName(item.name) ? null : (
                      <AppImage
                        recyclingKey={String(item.image ?? "")}
                        source={item.image}
                        style={styles.modalItemLogo}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        allowDownscaling={true}
                      />
                    )}
                    <CustomText
                      style={[
                        styles.modalItemText,
                        selectedItem?.name === item.name && {
                          fontWeight: "bold",
                        },
                      ]}
                    >
                      {getItemName(item)}
                    </CustomText>
                  </View>
                  {selectedItem?.name === item.name && (
                    <Check size={24} color={colors.accentText} />
                  )}
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <CustomText style={styles.closeButtonText}>
                {t("news.dropdown.cancel")}
              </CustomText>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};
export default memo(DropdownPicker);
