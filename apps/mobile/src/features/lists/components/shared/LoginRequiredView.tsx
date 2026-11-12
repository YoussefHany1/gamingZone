import { memo } from "react";
import { View } from "react-native";
import { TriangleAlert } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import PressScale from "@/src/components/PressScale";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useAuthGateStore } from "@/src/store/useAuthGateStore";

/**
 * Shown instead of the list when the user is anonymous / signed out. Renders
 * only the inner content; the caller supplies the `SafeAreaView` wrapper.
 */
const LoginRequiredView = memo(() => {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const openAuthGate = useAuthGateStore((s) => s.open);

  const styles = useThemeStyles((c) => ({
    emptyContainer: {
      alignItems: "center",
      justifyContent: "center",
      alignSelf: "center",
      margin: "auto",
      paddingHorizontal: 24,
    },
    emptyText: {
      color: c.text,
      fontSize: 16,
      textAlign: "center",
      opacity: 0.8,
      flexDirection: "column",
      alignItems: "center",
    },
    button: {
      marginTop: 20,
      backgroundColor: c.accent,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 12,
    },
    buttonText: {
      color: c.onAccent,
      fontWeight: "700",
      fontSize: 15,
    },
  }));

  return (
    <View style={styles.emptyContainer}>
      <CustomText style={styles.emptyText}>
        <TriangleAlert size={132} color={colors.accentText} />
        {"\n"}
        {t("common.loginRequired")}
      </CustomText>
      <PressScale style={styles.button} onPress={() => openAuthGate()}>
        <CustomText style={styles.buttonText}>{t("common.authPrompt.signIn")}</CustomText>
      </PressScale>
    </View>
  );
});
LoginRequiredView.displayName = "LoginRequiredView";

export default LoginRequiredView;
