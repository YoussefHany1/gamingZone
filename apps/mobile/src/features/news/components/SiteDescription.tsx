import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Bell, BellOff, SquareArrowOutUpRight } from "lucide-react-native";
import CustomText from "@/src/components/CustomText";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
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
  const colors = useThemeColors();

  const styles = useThemeStyles((c) => ({
    siteDesc: {
      flexDirection: "row-reverse",
      marginTop: 20,
      alignItems: "center",
    },
    siteImg: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: c.accent,
    },
    siteText: {
      marginHorizontal: 10,
    },
    siteName: {
      color: c.text,
      fontWeight: "bold",
      fontSize: 28,
    },
    siteAbout: {
      color: c.textMuted,
      width: 250,
    },
    buttons: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 12,
      gap: 12,
    },
    visitSiteBtn: {
      backgroundColor: c.accentSurface,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
    },
    visitSiteText: {
      color: c.accentText,
      fontSize: 14,
      fontWeight: "bold",
    },
    bellButton: {
      padding: 10,
      backgroundColor: c.accentSurface,
      borderRadius: 12,
    },
  }));

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
        <View style={[styles.siteImg, { backgroundColor: colors.accent }]} />
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
                زور الموقع <SquareArrowOutUpRight size={18} color={colors.text} />
              </CustomText>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => onVisitSite(selectedItem?.website)}
              style={styles.visitSiteBtn}
            >
              <CustomText style={styles.visitSiteText}>
                Visit Website <SquareArrowOutUpRight size={18} color={colors.text} />
              </CustomText>
            </TouchableOpacity>
          )}

          {/* Notification toggle */}
          <TouchableOpacity onPress={onToggleNotification} style={styles.bellButton}>
            {isNotifEnabled ? (
              <Bell size={24} color={colors.textMuted} />
            ) : (
              <BellOff size={24} color={colors.textSubtle} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default SiteDescription;
