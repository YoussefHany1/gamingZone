import React, { memo } from "react";
import { View } from "react-native";
import { TriangleAlert } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";

/**
 * Shown instead of the list when the user is anonymous / signed out. Renders
 * only the inner content; the caller supplies the `SafeAreaView` wrapper.
 */
const LoginRequiredView = memo(() => {
  const { t } = useTranslation();
  const colors = useThemeColors();

  const styles = useThemeStyles((c) => ({
    emptyContainer: {
      alignItems: "center",
      justifyContent: "center",
      alignSelf: "center",
      margin: "auto",
    },
    emptyText: {
      color: c.text,
      fontSize: 16,
      textAlign: "center",
      opacity: 0.8,
      flexDirection: "column",
      alignItems: "center",
    },
  }));

  return (
    <View style={styles.emptyContainer}>
      <CustomText style={styles.emptyText}>
        <TriangleAlert size={182} color={colors.accent} />
        {"\n"}
        {t("common.loginRequired")}
      </CustomText>
    </View>
  );
});
LoginRequiredView.displayName = "LoginRequiredView";

export default LoginRequiredView;
