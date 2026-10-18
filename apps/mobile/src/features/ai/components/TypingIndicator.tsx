import React, { memo } from "react";
import { View, ActivityIndicator } from "react-native";
import CustomText from "@/src/components/CustomText";
import { useTranslation } from "react-i18next";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";

/** Spinner + label shown while the assistant is generating a reply. */
const TypingIndicator: React.FC = () => {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const styles = useThemeStyles((c) => ({
    typingContainer: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    typingText: {
      color: c.textSubtle,
      marginLeft: 8,
      fontSize: 14,
      fontStyle: "italic",
    },
  }));

  return (
    <View style={styles.typingContainer}>
      <ActivityIndicator size="small" color={colors.accentText} />
      <CustomText style={styles.typingText}>{t("aiChat.typing")}</CustomText>
    </View>
  );
};

export default memo(TypingIndicator);
