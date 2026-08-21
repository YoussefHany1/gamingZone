import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import CustomText from "@/src/components/CustomText";
import COLORS from "@/src/constants/colors";
import type { RssFeedSource } from "../../news/types";

interface SiteDescriptionProps {
  selectedItem: RssFeedSource | null;
  isNotifEnabled: boolean;
  onVisitSite: (url?: string) => void;
  onToggleNotification: () => void;
}

const SiteDescription: React.FC<SiteDescriptionProps> = ({
  selectedItem,
  isNotifEnabled,
  onVisitSite,
  onToggleNotification,
}) => {
  const isLangArbic = selectedItem?.language === "ar";
  console.log(isLangArbic);
  return (
    <View style={[styles.siteDesc, { direction: isLangArbic ? "rtl" : "ltr" }]}>
      {selectedItem?.image ? (
        <Image
          recyclingKey={String(selectedItem.image)}
          source={selectedItem.image}
          style={styles.siteImg}
          contentFit="cover"
          cachePolicy="memory-disk"
          allowDownscaling={true}
        />
      ) : (
        <View style={[styles.siteImg, { backgroundColor: COLORS.secondary }]} />
      )}
      <View style={styles.siteText}>
        <CustomText style={styles.siteName}>{selectedItem?.name ?? ""}</CustomText>
        <CustomText style={styles.siteAbout}>{selectedItem?.aboutSite ?? ""}</CustomText>
        <View style={styles.buttons}>
          {/* Visit site — label changes based on site language */}
          {selectedItem?.language === "ar" ? (
            <TouchableOpacity
              onPress={() => onVisitSite(selectedItem?.website)}
              style={styles.visitSiteBtn}
            >
              <CustomText style={styles.visitSiteText}>
                زور الموقع{" "}
                <Ionicons name="arrow-up-right-box-outline" size={18} color="white" />
              </CustomText>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => onVisitSite(selectedItem?.website)}
              style={styles.visitSiteBtn}
            >
              <CustomText style={styles.visitSiteText}>
                Visit Website{" "}
                <Ionicons name="arrow-up-right-box-outline" size={18} color="white" />
              </CustomText>
            </TouchableOpacity>
          )}

          {/* Notification toggle */}
          <TouchableOpacity onPress={onToggleNotification} style={styles.bellButton}>
            <Ionicons
              name={isNotifEnabled ? "notifications" : "notifications-off-outline"}
              size={24}
              color={isNotifEnabled ? "#779bdd" : "#666"}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default SiteDescription;

const styles = StyleSheet.create({
  siteDesc: {
    flexDirection: "row-reverse",
    marginTop: 20,
    alignItems: "center",
  },
  siteImg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.secondary,
  },
  siteText: {
    marginHorizontal: 10,
  },
  siteName: {
    color: "white",
    fontWeight: "bold",
    fontSize: 28,
  },
  siteAbout: {
    color: "white",
    width: 250,
  },
  buttons: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 12,
  },
  visitSiteBtn: {
    backgroundColor: COLORS.secondary + "80",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  visitSiteText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
  bellButton: {
    padding: 10,
    backgroundColor: COLORS.secondary + "80",
    borderRadius: 12,
  },
});
