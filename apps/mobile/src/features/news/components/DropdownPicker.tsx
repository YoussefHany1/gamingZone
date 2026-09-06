import CustomText from "@/src/components/CustomText";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Modal,
  SectionList,
  ToastAndroid,
  SectionListData,
} from "react-native";
import { Image } from "expo-image";
import { Check, ChevronDown } from "lucide-react-native";
import COLORS from "@/src/constants/colors";
import { openLink } from "@/src/lib/browser";
import { useNotificationPreferences } from "@/src/hooks/useNotificationPreferences";
import NotificationService from "@/src/services/notificationService";
import { useState, memo, useMemo } from "react";
import SkeletonDropdown from "../skeleton/SkeletonDropdown";
import { useTranslation } from "react-i18next";
import NetInfo from "@react-native-community/netinfo";
import SiteDescription from "./SiteDescription";
import type { DropdownPickerProps, SectionData, RssFeedSource } from "../types";

const DropdownPicker: React.FC<DropdownPickerProps> = (props) => {
  const { t, i18n } = useTranslation();
  const { preferences, toggleSource } = useNotificationPreferences();
  const [modalVisible, setModalVisible] = useState<boolean>(false);

  const category = props.category.toLowerCase();
  const websites: RssFeedSource[] = props.websites ?? [];
  const selectedItem = props.value;

  // Build section list grouped by language, ordered by current app locale
  const sections: SectionData[] = useMemo(() => {
    const arabicSites = websites.filter((item) => item.language === "ar");
    const englishSites = websites.filter((item) => item.language === "en");

    const result: SectionData[] = [];

    const arSection: SectionData = {
      title: t("news.dropdown.arabicSources"),
      data: arabicSites,
    };
    const enSection: SectionData = {
      title: t("news.dropdown.englishSources"),
      data: englishSites,
    };

    const isEnglishApp = i18n.language.startsWith("en");

    if (isEnglishApp) {
      if (englishSites.length > 0) result.push(enSection);
      if (arabicSites.length > 0) result.push(arSection);
    } else {
      if (arabicSites.length > 0) result.push(arSection);
      if (englishSites.length > 0) result.push(enSection);
    }

    return result;
  }, [websites, i18n.language]);

  const handleToggleNotification = async (): Promise<void> => {
    const state = await NetInfo.fetch();
    if (!state.isConnected) {
      ToastAndroid.show(
        t("common.noInternet") || "No Internet Connection",
        ToastAndroid.LONG,
      );
      return;
    }
    toggleSource(category, selectedItem!.name);
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

  if (websites.length === 0 || !selectedItem) {
    return <SkeletonDropdown />;
  }

  const handleSelect = (item: RssFeedSource): void => {
    props.onChange?.(item);
    setModalVisible(false);
  };

  const notifTopic = NotificationService.getTopicName(category, selectedItem.name);
  const isNotifEnabled: boolean = notifTopic ? (preferences[notifTopic] ?? false) : false;

  return (
    <View style={styles.wrapper}>
      {/* Dropdown trigger */}
      <TouchableOpacity
        style={styles.pickerButton}
        activeOpacity={0.7}
        onPress={() => setModalVisible(true)}
      >
        {selectedItem?.image ? (
          <Image
            recyclingKey={String(selectedItem.image)}
            source={selectedItem.image}
            style={styles.avatar}
            contentFit="cover"
            cachePolicy="memory-disk"
            allowDownscaling={true}
          />
        ) : null}

        <CustomText style={styles.pickerButtonText} numberOfLines={1}>
          {selectedItem?.name || "Select a website..."}
        </CustomText>

        <ChevronDown size={20} color="#fff" />
      </TouchableOpacity>

      {/* Site description card */}
      <SiteDescription
        selectedItem={selectedItem}
        isNotifEnabled={isNotifEnabled}
        onVisitSite={handleVisitSite}
        onToggleNotification={handleToggleNotification}
      />

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
                    <Image
                      recyclingKey={String(item.image ?? "")}
                      source={item.image}
                      style={styles.modalItemLogo}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                      allowDownscaling={true}
                    />
                    <CustomText
                      style={[
                        styles.modalItemText,
                        selectedItem?.name === item.name && {
                          fontWeight: "bold",
                        },
                      ]}
                    >
                      {item.name}
                    </CustomText>
                  </View>
                  {selectedItem?.name === item.name && (
                    <Check size={24} color={COLORS.secondary} />
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

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    alignItems: "center",
    paddingBottom: 20,
    marginTop: 20,
  },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.button,
    borderWidth: 1,
    borderColor: "#779bdd",
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    width: "60%",
    justifyContent: "space-between",
  },
  pickerButtonText: {
    color: "#fff",
    fontSize: 16,
    flex: 1,
    marginHorizontal: 10,
    textAlign: "center",
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.secondary,
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
    backgroundColor: COLORS.darkBackground,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#333",
  },
  modalTitle: {
    color: "white",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  modalItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    padding: 10,
    borderBottomColor: "#333",
  },
  modalItemSelected: {
    backgroundColor: COLORS.secondary + "50",
    borderBottomColor: "transparent",
    borderRadius: 8,
  },
  modalItemLogo: {
    width: 25,
    height: 25,
    borderRadius: 50,
    marginRight: 10,
    backgroundColor: COLORS.secondary,
  },
  modalItemText: {
    color: "white",
    fontSize: 16,
  },
  closeButton: {
    marginTop: 15,
    alignItems: "center",
    padding: 10,
    backgroundColor: COLORS.secondary,
    borderRadius: 8,
  },
  closeButtonText: {
    color: "white",
    fontSize: 22,
    fontWeight: "bold",
  },
  sectionHeader: {
    backgroundColor: COLORS.darkBackground,
    paddingVertical: 12,
    paddingHorizontal: 5,
  },
  sectionHeaderText: {
    color: "#aaa",
    fontSize: 14,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
});
