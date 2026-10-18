import React, { memo } from "react";
import { Pressable } from "react-native";
import { ExternalLink } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import type { ReadFullArticleButtonProps } from "./types";

/** Primary CTA that opens the original article on its source site. */
const ReadFullArticleButton = memo(function ReadFullArticleButton({
  onPress,
}: ReadFullArticleButtonProps) {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const styles = useThemeStyles((c) => ({
    button: {
      backgroundColor: c.accent,
      padding: 15,
      borderRadius: 12,
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "center",
      marginVertical: 20,
    },
    buttonText: {
      color: c.text,
      fontSize: 16,
      fontWeight: "bold",
    },
    buttonIcon: {
      marginRight: 8,
    },
  }));

  return (
    <Pressable
      style={styles.button}
      android_ripple={{ color: colors.textMuted }}
      onPress={onPress}
    >
      <ExternalLink size={20} color={colors.text} style={styles.buttonIcon} />
      <CustomText style={styles.buttonText}>
        {t("news.details.readFullArticle")}
      </CustomText>
    </Pressable>
  );
});

export default ReadFullArticleButton;
