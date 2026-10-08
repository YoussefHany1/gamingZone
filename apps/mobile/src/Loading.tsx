import React, { memo } from "react";
import { View, ActivityIndicator } from "react-native";
import CustomText from "./components/CustomText";
import { useTranslation } from "react-i18next";
import { useThemeColors } from "./hooks/useTheme";
import { useThemeStyles } from "./hooks/useThemeStyles";

const Loading: React.FC = memo(() => {
  const { t } = useTranslation();
  const colors = useThemeColors();

  const styles = useThemeStyles((c) => ({
    loadingContainer: {
      flex: 1,
      zIndex: 100,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: c.background,
    },
    loadingText: {
      color: c.accentText,
      marginTop: 10,
      fontSize: 16,
    },
  }));

  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.accent} />
      <CustomText style={styles.loadingText}>{t("common.loading")}</CustomText>
    </View>
  );
});

Loading.displayName = "Loading";

export default Loading;
