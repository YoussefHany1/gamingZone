import { View, Text, TouchableOpacity, Share, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

function InviteFriendsBtn() {
  const { t } = useTranslation();

  const onShare = async () => {
    try {
      const result = await Share.share({
        message:
          "Level up your gaming experience with Gaming Zone! 🎮\nGet the latest news, free game alerts, and manage your gaming wishlist—all in one app.\nTry it Now!: https://play.google.com/store/apps/details?id=com.yh.gamingzone",
      });
      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          // shared with activity type of result.activityType
        } else {
          // shared
        }
      } else if (result.action === Share.dismissedAction) {
        // dismissed
      }
    } catch (error) {
      alert(error.message);
    }
  };

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
}

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
    marginRight: 8, // للغات التي تكتب من اليسار لليمين، قد تحتاج لتعديل هذا بناءً على الاتجاه
    textAlign: "left",
  },
});

export default InviteFriendsBtn;
