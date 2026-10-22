import React, { memo, useEffect, useRef } from "react";
import { Animated, View } from "react-native";
import { Zap } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import type { XpToastProps } from "../types";

const VISIBLE_MS = 2200;

/**
 * The "+50 XP" toast.
 *
 * This is an in-app overlay on purpose. The app's usual feedback channel is
 * `ToastAndroid.show`, which is a no-op on iOS — so on that platform an XP
 * award would otherwise be invisible. The overlay works the same on both
 * platforms.
 */
const XpToast = memo(
  ({ toast, onDismiss }: XpToastProps): React.ReactElement | null => {
    const colors = useThemeColors();
    const { t } = useTranslation();
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(-12)).current;

    useEffect(() => {
      if (!toast) return;

      opacity.setValue(0);
      translateY.setValue(-12);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          friction: 8,
          tension: 70,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished) onDismiss();
        });
      }, VISIBLE_MS);

      return () => clearTimeout(timer);
    }, [toast, onDismiss, opacity, translateY]);

    const styles = useThemeStyles((c) => ({
      wrap: {
        position: "absolute",
        top: 54,
        alignSelf: "center",
        zIndex: 1000,
        elevation: 8,
      },
      pill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: c.accent,
        borderRadius: 999,
        paddingVertical: 9,
        paddingHorizontal: 16,
      },
      amount: {
        color: c.onAccent,
        fontSize: 14,
        fontWeight: "800",
      },
      label: {
        color: c.onAccent,
        fontSize: 13,
        fontWeight: "600",
      },
    }));

    if (!toast) return null;

    return (
      <Animated.View
        pointerEvents="none"
        style={[
          styles.wrap,
          { opacity, transform: [{ translateY }] },
        ]}
      >
        <View style={styles.pill}>
          <Zap size={16} color={colors.onAccent} />
          <CustomText style={styles.amount}>
            {t("gamification.xpAmount", { xp: toast.amount }) ?? `+${toast.amount} XP`}
          </CustomText>
          <CustomText style={styles.label}>{t(toast.labelKey)}</CustomText>
        </View>
      </Animated.View>
    );
  },
);

XpToast.displayName = "XpToast";
export default XpToast;
