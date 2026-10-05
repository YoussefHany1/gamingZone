import React, { memo } from "react";
import { View, Switch } from "react-native";
import { Megaphone } from "lucide-react-native";
import CustomText from "@/src/components/CustomText";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useAdsStore } from "@/src/store/useAdsStore";
import { useTranslation } from "react-i18next";

const AdminAdsToggle = memo(() => {
  const colors = useThemeColors();
  const styles = useThemeStyles((c) => ({
    menuItem: {
      marginVertical: 8,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 16,
      backgroundColor: c.surface,
      borderRadius: 12,
    },
    menuItemLeft: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    menuIcon: {
      marginRight: 8,
    },
    menuLabel: {
      fontSize: 18,
      fontWeight: "600",
      color: c.text,
    },
  }));

  const { t } = useTranslation();
  const adsEnabled = useAdsStore((state) => state.adsEnabled);
  const setAdsEnabled = useAdsStore((state) => state.setAdsEnabled);

  return (
    <View style={styles.menuItem}>
      <View style={styles.menuItemLeft}>
        <Megaphone size={20} color={colors.textMuted} style={styles.menuIcon} />
        <CustomText style={styles.menuLabel}>{t("settings.menu.showAds")}</CustomText>
      </View>
      <Switch
        value={adsEnabled}
        onValueChange={setAdsEnabled}
        trackColor={{ false: "#3e3e3e", true: colors.textMuted }}
        thumbColor={adsEnabled ? colors.text : "#f4f3f4"}
      />
    </View>
  );
});
AdminAdsToggle.displayName = "AdminAdsToggle";
export default AdminAdsToggle;
