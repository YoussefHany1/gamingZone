import React, { memo } from "react";
import { TouchableOpacity, View } from "react-native";
import { ArrowLeft, ArrowRight, Share2 } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useFloatingTopInset } from "@/src/hooks/useBottomInset";
import type { NewsDetailsHeaderProps } from "./types";

/** Floating back + share buttons over the article hero. */
const NewsDetailsHeader = memo(function NewsDetailsHeader({
  currentLang,
  onBack,
  onShare,
}: NewsDetailsHeaderProps) {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const topInset = useFloatingTopInset(10);
  const styles = useThemeStyles(
    (c) => ({
      header: {
        position: "absolute",
        width: "90%",
        height: 40,
        top: topInset,
        left: 15,
        right: 15,
        zIndex: 1000,
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
      },
      iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: c.accentSurface,
        justifyContent: "center",
        alignItems: "center",
      },
    }),
    [topInset],
  );

  const isRtl = currentLang === "ar";

  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.iconButton}
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel={t("common.back")}
      >
        {isRtl ? (
          <ArrowRight size={28} color={colors.text} accessible={false} />
        ) : (
          <ArrowLeft size={28} color={colors.text} accessible={false} />
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.iconButton}
        onPress={onShare}
        accessibilityRole="button"
        accessibilityLabel={t("common.share")}
      >
        <Share2 size={28} color={colors.text} accessible={false} />
      </TouchableOpacity>
    </View>
  );
});

export default NewsDetailsHeader;
