import React, { useEffect, useRef, memo } from "react";
import { Image } from "expo-image";
import { View, StyleSheet, Animated, Easing, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import CustomText from "./CustomText";
import COLORS from "../constants/colors";
import { ArrowDownToLine } from "lucide-react-native";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const { width: SCREEN_W } = Dimensions.get("window");
const BAR_WIDTH = SCREEN_W * 0.72;

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

/** Animated shimmer that sweeps across the progress fill. */
const Shimmer = memo(() => {
  const shimmerX = useRef(new Animated.Value(-BAR_WIDTH * 0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerX, {
        toValue: BAR_WIDTH * 1.2,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
  }, [shimmerX]);

  return (
    <Animated.View style={[styles.shimmer, { transform: [{ translateX: shimmerX }] }]} />
  );
});
Shimmer.displayName = "Shimmer";

/** Pulsing glow behind the logo text. */
const PulseGlow = memo(() => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 1000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [opacity]);

  return <Animated.View style={[styles.glow, { opacity }]} />;
});
PulseGlow.displayName = "PulseGlow";

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface UpdateScreenProps {
  /** Download progress 0 → 1 */
  progress: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

const UpdateScreen: React.FC<UpdateScreenProps> = memo(({ progress }) => {
  const { t } = useTranslation();

  // Animated width of the fill bar
  const fillWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fillWidth, {
      toValue: progress * BAR_WIDTH,
      duration: 200,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false, // layout animation — must be false
    }).start();
  }, [progress, fillWidth]);

  const percent = Math.round(progress * 100);

  return (
    <View style={styles.root}>
      {/* ── Logo area ── */}
      <View style={styles.logoArea}>
        <Image
          source={require("@/assets/icon.png")}
          style={styles.logoBox}
          contentFit="contain"
          cachePolicy="memory"
          allowDownscaling
        />
        <CustomText style={styles.appName}>Gaming Zone</CustomText>
        <CustomText style={styles.tagline}>
          {t("common.update.tagline", "Your gaming universe")}
        </CustomText>
      </View>

      {/* ── Update card ── */}
      <View style={styles.card}>
        <View style={styles.cardInner}>
          {/* Icon row */}
          <View style={styles.iconRow}>
            <View style={styles.iconCircle}>
              <ArrowDownToLine color={COLORS.lightGray} size={20} />
            </View>
            <View style={styles.textGroup}>
              <CustomText style={styles.updateTitle}>
                {t("common.update.title", "New Update Available")}
              </CustomText>
              <CustomText style={styles.updateSubtitle}>
                {t("common.update.subtitle", "We're downloading improvements for you...")}
              </CustomText>
            </View>
          </View>

          {/* Progress bar */}
          <View style={styles.barTrack}>
            <Animated.View style={[styles.barFill, { width: fillWidth }]}>
              <LinearGradient
                colors={["#779bdd", "#3a6bc4", "#5a8fe8"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              <Shimmer />
            </Animated.View>
          </View>

          {/* Percent label */}
          <CustomText style={styles.percent}>{percent}%</CustomText>
        </View>
      </View>

      {/* ── Footer ── */}
      <CustomText style={styles.footer}>
        {t("common.update.footer", "Please wait, the app will restart automatically")}
      </CustomText>
    </View>
  );
});

UpdateScreen.displayName = "UpdateScreen";
export default UpdateScreen;

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: COLORS.primary,
  },

  // ── Decorative ──
  circleTopRight: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(119,155,221,0.06)",
    top: -80,
    right: -80,
  },
  circleBottomLeft: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(58,107,196,0.07)",
    bottom: -60,
    left: -60,
  },

  // ── Logo ──
  logoArea: {
    alignItems: "center",
    marginBottom: 52,
  },
  glow: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(119,155,221,0.18)",
    top: -8,
  },
  logoBox: {
    width: 120,
    height: 120,
    borderRadius: 22,
  },
  appName: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.textLight,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 13,
    color: COLORS.secondary,
  },

  // ── Card ──
  card: {
    width: "100%",
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(119,155,221,0.15)",
    overflow: "hidden",
    marginBottom: 24,
  },
  cardInner: {
    padding: 24,
    alignItems: "center",
  },
  iconRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    marginBottom: 20,
    gap: 14,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(119,155,221,0.15)",
    borderWidth: 1,
    borderColor: "rgba(119,155,221,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    fontSize: 20,
    color: COLORS.lightGray,
    fontWeight: "700",
  },
  textGroup: {
    flex: 1,
  },
  updateTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textLight,
    marginBottom: 3,
  },
  updateSubtitle: {
    fontSize: 12,
    color: COLORS.secondary,
    lineHeight: 17,
  },

  // ── Bar ──
  barTrack: {
    width: BAR_WIDTH,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(119,155,221,0.12)",
    overflow: "hidden",
    marginBottom: 10,
  },
  barFill: {
    height: "100%",
    borderRadius: 4,
    overflow: "hidden",
  },
  shimmer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: BAR_WIDTH * 0.4,
    backgroundColor: "rgba(255,255,255,0.25)",
    transform: [{ skewX: "-15deg" }],
  },
  percent: {
    fontSize: 13,
    color: COLORS.lightGray,
    fontWeight: "600",
    letterSpacing: 0.5,
  },

  // ── Footer ──
  footer: {
    fontSize: 12,
    color: "rgba(81,105,150,0.8)",
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 16,
  },
});
