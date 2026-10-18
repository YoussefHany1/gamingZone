import React, { memo, useEffect } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { MessagesSquare } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { withAlpha } from "@/src/constants/colorUtils";
import type { AIChatFabProps } from "./types";

const GRADIENT_START = { x: 0, y: 0 };
const GRADIENT_END = { x: 1, y: 1 };

const PULSE_MIN = 1;
const PULSE_MAX = 1.06;
const PULSE_DURATION = 1600;

/**
 * Pulsing glass floating button that opens the AI chat. Owns its own scale
 * animation so the surrounding screen never re-renders for it.
 */
const AIChatFab = memo(function AIChatFab({ onPress }: AIChatFabProps) {
  const colors = useThemeColors();
  const { t } = useTranslation();
  // Accent-tinted glass instead of the old fixed navy gradient — the button
  // followed the accent everywhere else, so this keeps it consistent (and
  // readable) across every theme style and appearance.
  const fabGradient: [string, string] = [
    withAlpha(colors.accent, 0.55),
    withAlpha(colors.accentText, 0.8),
  ];
  const styles = useThemeStyles((c) => ({
    fabWrapper: {
      position: "absolute",
      bottom: 100,
      right: 20,
      width: 60,
      height: 60,
      elevation: 8,
      shadowColor: c.textMuted,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    },
    fabGlass: {
      flex: 1,
      borderRadius: 30,
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
    },
    fabBaseFill: {
      backgroundColor: c.scrim,
      borderRadius: 30,
    },
    fabBorder: {
      borderRadius: 30,
      borderWidth: 1,
      borderColor: c.border,
    },
    fabIcon: {
      zIndex: 1,
    },
  }));

  const pulseScale = useSharedValue(PULSE_MIN);
  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(PULSE_MAX, { duration: PULSE_DURATION }),
        withTiming(PULSE_MIN, { duration: PULSE_DURATION }),
      ),
      -1,
      false,
    );
  }, [pulseScale]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  return (
    <Animated.View style={[styles.fabWrapper, pulseStyle]}>
      <TouchableOpacity
        style={styles.fabGlass}
        onPress={onPress}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={t("aiChat.title")}
      >
        <View style={[StyleSheet.absoluteFill, styles.fabBaseFill]} />
        <LinearGradient
          colors={fabGradient}
          start={GRADIENT_START}
          end={GRADIENT_END}
          style={StyleSheet.absoluteFill}
        />
        <View style={[StyleSheet.absoluteFill, styles.fabBorder]} />
        <View collapsable={false}>
          <MessagesSquare size={28} color={colors.text} style={styles.fabIcon} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

AIChatFab.displayName = "AIChatFab";

export default AIChatFab;
