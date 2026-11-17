import React, { memo } from "react";
import { View, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { CirclePlay, Radio } from "lucide-react-native";
import CustomText from "@/src/components/CustomText";
import { useTranslation } from "react-i18next";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import type { EventStreamButtonProps } from "../types";

const GRADIENT_START = { x: 0, y: 0 };
const GRADIENT_END = { x: 1, y: 1 };

/** Watch-now (live) / event-details (upcoming) gradient button. */
const EventStreamButton: React.FC<EventStreamButtonProps> = ({ status, onPress }) => {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const styles = useThemeStyles((c) => ({
    streamBtnWrap: { marginTop: 20 },
    streamBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      paddingVertical: 14,
      borderRadius: 14,
      elevation: 4,
      shadowColor: c.danger,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.4,
      shadowRadius: 6,
    },
    streamBtnText: {
      color: c.text,
      fontSize: 16,
      fontWeight: "bold",
      letterSpacing: 0.5,
    },
  }));

  const isLive = status === "live";
  const gradientColors: [string, string] = isLive
    ? [colors.danger, colors.danger + "20"]
    : [colors.accent, colors.textMuted];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.streamBtnWrap, pressed && { opacity: 0.85 }]}
      android_ripple={{ color: "rgba(255,255,255,0.18)", borderless: false }}
      accessibilityRole="button"
    >
      <LinearGradient
        colors={gradientColors}
        style={styles.streamBtn}
        start={GRADIENT_START}
        end={GRADIENT_END}
      >
        {isLive ? (
          <View collapsable={false}>
            <Radio size={22} color={colors.text} />
          </View>
        ) : (
          <View collapsable={false}>
            <CirclePlay size={22} color={colors.text} />
          </View>
        )}
        <CustomText style={styles.streamBtnText}>
          {isLive
            ? t("home.gamingEvents.watchNowButton")
            : t("home.gamingEvents.detailsButton")}
        </CustomText>
      </LinearGradient>
    </Pressable>
  );
};

export default memo(EventStreamButton);
