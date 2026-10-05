import React, { memo, useCallback } from "react";
import { View, Pressable, ActivityIndicator } from "react-native";
import CustomText from "./CustomText";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import type { LucideIcon } from "lucide-react-native";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";

interface EmptyStateProps {
  message?: string;
  subMessage?: string;
  showContactButton?: boolean;
  icon?: LucideIcon;
  iconColor?: string;
  iconSize?: number;
  onRetry?: () => void;
  retrying?: boolean;
}

const EmptyState = memo(
  ({
    message,
    subMessage,
    showContactButton = true,
    icon,
    iconColor,
    iconSize = 80,
    onRetry,
    retrying = false,
  }: EmptyStateProps) => {
    const navigation =
      useNavigation<NavigationProp<Record<string, object | undefined>>>();
    const { t } = useTranslation();
    const colors = useThemeColors();

    const styles = useThemeStyles((c) => ({
      emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
      },
      noDataText: {
        color: c.text,
        textAlign: "center",
        borderRadius: 8,
        marginBottom: 20,
        fontSize: 16,
      },
      subMessageText: {
        color: c.textSubtle,
        fontSize: 14,
        textAlign: "center",
        marginTop: -10,
        marginBottom: 20,
        paddingHorizontal: 20,
      },
      iconStyles: {
        marginBottom: 15,
      },
      contactButton: {
        backgroundColor: c.accent,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
        marginTop: 12,
      },
      contactButtonSecondary: {
        marginTop: 4,
        backgroundColor: c.surface,
      },
      contactButtonText: {
        color: c.onAccent,
        fontWeight: "bold",
        fontSize: 14,
      },
      // The secondary variant sits on `surface`, not on the accent fill, so
      // it needs the regular text color instead of `onAccent`.
      contactButtonTextSecondary: {
        color: c.text,
      },
      disabled: {
        opacity: 0.6,
      },
    }));

    const handleContactPress = useCallback(() => {
      const parent = navigation.getParent();
      const nav = parent ?? navigation;
      nav.navigate("Settings", { screen: "ContactScreen", initial: false });
    }, [navigation]);

    return (
      <View style={styles.emptyContainer}>
        {icon &&
          (() => {
            const Icon = icon;
            return (
              <Icon
                size={iconSize}
                color={iconColor || colors.textMuted}
                style={styles.iconStyles}
              />
            );
          })()}
        <CustomText style={styles.noDataText}>
          {message || t("news.noArticles")}
        </CustomText>
        {subMessage && (
          <CustomText style={styles.subMessageText}>{subMessage}</CustomText>
        )}

        {onRetry && (
          <Pressable
            style={[styles.contactButton, retrying && styles.disabled]}
            android_ripple={{ color: "rgba(255,255,255,0.2)" }}
            onPress={onRetry}
            disabled={retrying}
            accessibilityLabel={t("common.retryButton")}
            accessibilityRole="button"
          >
            {retrying ? (
              <ActivityIndicator color={colors.onAccent} size="small" />
            ) : (
              <CustomText style={styles.contactButtonText}>
                {t("common.retryButton")}
              </CustomText>
            )}
          </Pressable>
        )}

        {showContactButton && (
          <Pressable
            style={[styles.contactButton, onRetry && styles.contactButtonSecondary]}
            android_ripple={{ color: "rgba(255,255,255,0.2)" }}
            onPress={handleContactPress}
            accessibilityLabel={t("news.contactSupport")}
            accessibilityRole="button"
          >
            <CustomText
              style={[
                styles.contactButtonText,
                onRetry && styles.contactButtonTextSecondary,
              ]}
            >
              {t("news.contactSupport")}
            </CustomText>
          </Pressable>
        )}
      </View>
    );
  },
);

EmptyState.displayName = "EmptyState";
export default EmptyState;
