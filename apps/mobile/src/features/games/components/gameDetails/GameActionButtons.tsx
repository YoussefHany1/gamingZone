import React, { memo, useCallback } from "react";
import { View, Pressable } from "react-native";
import CustomText from "@/src/components/CustomText";
import { Bell, CirclePlus, Gift } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { openLink } from "@/src/lib/browser";
import type { GameActionButtonsProps } from "../../types";

/** Capitalises the first character of a string. */
function capitalise(str: string): string {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : str;
}

const GRADIENT_START = { x: 0, y: 0 };
const GRADIENT_END = { x: 1, y: 0 };

const GameActionButtons: React.FC<GameActionButtonsProps> = ({
  claimUrl,
  store = "",
  onAddToList,
  isUpcoming,
  isSubscribed,
  onToggleNotification,
}) => {
  const colors = useThemeColors();
  const gradientColors: [string, string] = [colors.accent, "#3b4d6e"];
  const styles = useThemeStyles((c) => ({
    container: {
      marginVertical: 16,
      gap: 12,
    },
    buttonWrapper: {
      width: "100%",
    },
    button: {
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
      gap: 10,
    },
    buttonSubscribed: {
      borderWidth: 1.5,
      borderColor: c.accentBorder,
      borderRadius: 12,
    },
    buttonText: {
      color: c.text,
      fontSize: 17,
      fontWeight: "bold",
      letterSpacing: 0.3,
    },
  }));

  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;

  const handleClaimPress = useCallback(() => {
    if (claimUrl) openLink(claimUrl);
  }, [claimUrl]);

  return (
    <View style={styles.container}>
      {claimUrl && (
        <Pressable
          onPress={handleClaimPress}
          style={({ pressed }) => [styles.buttonWrapper, pressed && { opacity: 0.85 }]}
          android_ripple={{ color: "rgba(255,255,255,0.18)", borderless: false }}
          accessibilityLabel={`${t("games.details.claimNow")} ${capitalise(store)}`}
          accessibilityRole="button"
        >
          <LinearGradient
            colors={gradientColors}
            start={GRADIENT_START}
            end={GRADIENT_END}
            style={styles.button}
          >
            <Gift size={22} color={colors.text} />
            <CustomText style={styles.buttonText}>
              {`${t("games.details.claimNow")} ${capitalise(store)}`}
            </CustomText>
          </LinearGradient>
        </Pressable>
      )}

      {isUpcoming && onToggleNotification && (
        <Pressable
          onPress={onToggleNotification}
          style={({ pressed }) => [styles.buttonWrapper, pressed && { opacity: 0.85 }]}
          android_ripple={{ color: "rgba(255,255,255,0.18)", borderless: false }}
          accessibilityLabel={
            isSubscribed
              ? t("games.details.notificationEnabled", "Notification Enabled")
              : t("games.details.notifyOnRelease", "Notify on Release")
          }
          accessibilityRole="button"
        >
          <LinearGradient
            colors={gradientColors}
            start={GRADIENT_START}
            end={GRADIENT_END}
            style={[styles.button, isSubscribed && styles.buttonSubscribed]}
          >
            <Bell
              size={22}
              color={colors.text}
              fill={isSubscribed ? colors.text : "none"}
            />
            <CustomText style={styles.buttonText}>
              {isSubscribed
                ? t("games.details.notificationEnabled")
                : t("games.details.notifyOnRelease")}
            </CustomText>
          </LinearGradient>
        </Pressable>
      )}

      <Pressable
        onPress={onAddToList}
        style={({ pressed }) => [styles.buttonWrapper, pressed && { opacity: 0.85 }]}
        android_ripple={{ color: "rgba(255,255,255,0.18)", borderless: false }}
        accessibilityLabel={t("games.details.addToList")}
        accessibilityRole="button"
      >
        <LinearGradient
          colors={gradientColors}
          start={GRADIENT_START}
          end={GRADIENT_END}
          style={styles.button}
        >
          <CirclePlus size={22} color={colors.text} />
          <CustomText style={styles.buttonText}>
            {t("games.details.addToList")}
          </CustomText>
        </LinearGradient>
      </Pressable>
    </View>
  );
};

export default memo(GameActionButtons);
