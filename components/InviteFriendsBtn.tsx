import React, { memo, useCallback } from "react";
import { View, Text, TouchableOpacity, Share, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

const STORE_URL =
  "https://play.google.com/store/apps/details?id=com.yh.gamingzone";

const InviteFriendsBtn: React.FC = memo(() => {
  const { t } = useTranslation();

  // Memoized share handler to avoid re-creation on re-renders
  const onShare = useCallback(async (): Promise<void> => {
    try {
      const result = await Share.share({
        message: `Level up your gaming experience with Gaming Zone! 🎮\nGet the latest news, free game alerts, and manage your gaming wishlist—all in one app.\nTry it Now!: ${STORE_URL}`,
      });

      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          // Shared with a specific activity type
        } else {
          // Shared successfully
        }
      } else if (result.action === Share.dismissedAction) {
        // User dismissed the share sheet
      }
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message);
      }
    }
  }, []);

  return (
    <TouchableOpacity style={styles.categoryHeader} onPress={onShare}>
      <View style={styles.categoryHeaderLeft}>
        <Ionicons
          name="share-social-sharp"
          size={20}
          color="#779bdd"
          style={styles.chevronIcon}
        />
        <Text style={styles.categoryTitle}>
          {t("settings.menu.inviteFriends")}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

InviteFriendsBtn.displayName = "InviteFriendsBtn";
export default InviteFriendsBtn;

const styles = StyleSheet.create({
  categoryHeader: {
    marginVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "rgba(119, 155, 221, 0.2)",
    borderRadius: 12,
  },
  categoryHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  chevronIcon: {
    marginRight: 8,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginRight: 8,
    textAlign: "left",
  },
});

