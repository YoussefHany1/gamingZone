import React, { memo, useCallback } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import COLORS from "../constants/colors";

interface EmptyStateProps {
  message?: string;
  subMessage?: string;
  showContactButton?: boolean;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  iconColor?: string;
  iconSize?: number;
}

const EmptyState = memo(({
  message,
  subMessage,
  showContactButton = true,
  icon,
  iconColor,
  iconSize = 80,
}: EmptyStateProps) => {
  const navigation = useNavigation<any>();
  const { t } = useTranslation();

  const handleContactPress = useCallback(() => {
    const parent = navigation.getParent();
    const nav = parent ?? navigation;
    nav.navigate("Settings", { screen: "ContactScreen", initial: false });
  }, [navigation]);

  return (
    <View style={styles.emptyContainer}>
      {icon && (
        <Ionicons
          name={icon}
          size={iconSize}
          color={iconColor || COLORS.primary}
          style={styles.iconStyles}
        />
      )}
      <Text style={styles.noDataText}>{message || t("news.noArticles")}</Text>
      {subMessage && (
        <Text style={styles.subMessageText}>{subMessage}</Text>
      )}

      {showContactButton && (
        <Pressable
          style={styles.contactButton}
          android_ripple={{ color: "rgba(255,255,255,0.2)" }}
          onPress={handleContactPress}
        >
          <Text style={styles.contactButtonText}>{t("news.contactSupport")}</Text>
        </Pressable>
      )}
    </View>
  );
});

EmptyState.displayName = "EmptyState";
export default EmptyState;

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  noDataText: {
    color: "white",
    textAlign: "center",
    borderRadius: 8,
    marginBottom: 20,
    fontSize: 16,
  },
  subMessageText: {
    color: "gray",
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
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  contactButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
});
