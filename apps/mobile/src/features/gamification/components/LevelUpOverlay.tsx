import React, { memo, useEffect, useRef } from "react";
import { Animated, Modal, View, TouchableOpacity } from "react-native";
import { Trophy } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import type { LevelUpOverlayProps } from "../types";

/**
 * The level-up celebration.
 *
 * It is raised from the authoritative sync, not from the local award path:
 * until the counters have been read the app does not know the user's real
 * level, and celebrating a level they have not reached is worse than
 * celebrating it a moment later.
 */
const LevelUpOverlay = memo(
  ({ levelUp, onDismiss }: LevelUpOverlayProps): React.ReactElement | null => {
    const colors = useThemeColors();
    const { t } = useTranslation();
    const scale = useRef(new Animated.Value(0.85)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      if (!levelUp) return;

      scale.setValue(0.85);
      opacity.setValue(0);
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          friction: 6,
          tension: 90,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }, [levelUp, scale, opacity]);

    const styles = useThemeStyles((c) => ({
      backdrop: {
        flex: 1,
        backgroundColor: c.overlay,
        alignItems: "center",
        justifyContent: "center",
        padding: 28,
      },
      card: {
        width: "100%",
        maxWidth: 340,
        backgroundColor: c.background,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: c.accentBorder,
        paddingVertical: 30,
        paddingHorizontal: 24,
        alignItems: "center",
      },
      iconWrap: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: c.accent,
        marginBottom: 16,
      },
      title: {
        color: c.text,
        fontSize: 22,
        fontWeight: "800",
        textAlign: "center",
      },
      body: {
        color: c.textMuted,
        fontSize: 14,
        fontWeight: "600",
        textAlign: "center",
        marginTop: 8,
      },
      button: {
        marginTop: 24,
        backgroundColor: c.accent,
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 28,
      },
      buttonText: {
        color: c.onAccent,
        fontSize: 15,
        fontWeight: "700",
      },
    }));

    if (!levelUp) return null;

    return (
      <Modal
        visible
        transparent
        animationType="fade"
        onRequestClose={onDismiss}
        statusBarTranslucent
      >
        <Animated.View style={[styles.backdrop, { opacity }]}>
          <TouchableOpacity activeOpacity={1} onPress={onDismiss}>
            <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
              <View style={styles.iconWrap}>
                <Trophy size={34} color={colors.onAccent} />
              </View>
              <CustomText style={styles.title}>
                {t("gamification.levelUp.title", { level: levelUp.toLevel }) ??
                  `Level ${levelUp.toLevel}!`}
              </CustomText>
              <CustomText style={styles.body}>
                {t("gamification.levelUp.body", { level: levelUp.toLevel }) ??
                  `You reached Level ${levelUp.toLevel}.`}
              </CustomText>
              <TouchableOpacity
                style={styles.button}
                onPress={onDismiss}
                activeOpacity={0.8}
              >
                <CustomText style={styles.buttonText}>
                  {t("common.ok") ?? "OK"}
                </CustomText>
              </TouchableOpacity>
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>
      </Modal>
    );
  },
);

LevelUpOverlay.displayName = "LevelUpOverlay";
export default LevelUpOverlay;
