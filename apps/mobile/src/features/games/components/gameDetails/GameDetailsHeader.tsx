import React, { memo } from "react";
import { View, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight } from "lucide-react-native";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useFloatingTopInset } from "@/src/hooks/useBottomInset";
import type { GameDetailsHeaderProps } from "./types";

/** Floating back button overlaid on the gallery; the arrow flips for RTL. */
const GameDetailsHeader: React.FC<GameDetailsHeaderProps> = ({ onBack }) => {
  const colors = useThemeColors();
  const { t, i18n } = useTranslation();
  const topInset = useFloatingTopInset(15);
  const styles = useThemeStyles(
    (c) => ({
      header: {
        position: "absolute",
        width: 40,
        height: 40,
        top: topInset,
        left: 10,
        zIndex: 1000,
      },
      backButton: {
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

  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={onBack}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        accessibilityRole="button"
        accessibilityLabel={t("common.back")}
      >
        {i18n.language === "ar" ? (
          <ArrowRight size={28} color={colors.text} />
        ) : (
          <ArrowLeft size={28} color={colors.text} />
        )}
      </TouchableOpacity>
    </View>
  );
};

export default memo(GameDetailsHeader);
