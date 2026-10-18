import React, { memo } from "react";
import { TouchableOpacity, View } from "react-native";
import { ArrowLeft, ArrowRight, Share2 } from "lucide-react-native";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import type { NewsDetailsHeaderProps } from "./types";

/** Floating back + share buttons over the article hero. */
const NewsDetailsHeader = memo(function NewsDetailsHeader({
  currentLang,
  onBack,
  onShare,
}: NewsDetailsHeaderProps) {
  const colors = useThemeColors();
  const styles = useThemeStyles((c) => ({
    header: {
      position: "absolute",
      width: "90%",
      height: 40,
      top: 40,
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
  }));

  const isRtl = currentLang === "ar";

  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.iconButton} onPress={onBack}>
        {isRtl ? (
          <ArrowRight size={28} color={colors.text} />
        ) : (
          <ArrowLeft size={28} color={colors.text} />
        )}
      </TouchableOpacity>
      <TouchableOpacity style={styles.iconButton} onPress={onShare}>
        <Share2 size={28} color={colors.text} />
      </TouchableOpacity>
    </View>
  );
});

export default NewsDetailsHeader;
