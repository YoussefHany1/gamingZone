import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  FlatList,
  ScrollView,
  ToastAndroid,
} from "react-native";
import { Image } from "expo-image";
import { useState, useEffect, memo, useCallback } from "react";
import { LinearGradient } from "expo-linear-gradient";
import SkeletonFreeGames from "../../skeleton/SkeletonFreeGames";
import { useTranslation } from "react-i18next";
import COLORS from "../../constants/colors";
import { Ionicons } from "@expo/vector-icons";
import auth from "@react-native-firebase/auth";
import NotificationService from "../../notificationService";
import analytics from "@react-native-firebase/analytics";
import NetInfo from "@react-native-community/netinfo";
import { databases } from "../../lib/appwrite";
import { Query } from "react-native-appwrite";
import Constants from "expo-constants";
import { useCountdown } from "../../hooks/useCountdown";
import useCachedData from "../../hooks/useCachedData";

const FREE_GAMES_COLLECTION_ID = "free_games";
const NOTIF_CATEGORY = "free_games";
const NOTIF_SOURCE = "alerts";
const FREE_GAMES_CACHE_KEY = "FREE_GAMES_APPWRITE_CACHE";
const dbId = Constants.expoConfig?.extra?.APPWRITE_DATABASE_ID;

// fetch games from Appwrite
const fetchFreeGamesFromAppwrite = async () => {
  const netState = await NetInfo.fetch();
  if (!netState.isConnected) {
    throw new Error("No internet connection");
  }

  try {
    const response = await databases.listDocuments(
      dbId,
      FREE_GAMES_COLLECTION_ID,
      [Query.orderAsc("type"), Query.limit(20)],
    );

    return response.documents.map((doc) => ({
      id: doc.$id,
      title: doc.title,
      image: doc.image,
      slug: doc.slug,
      store: doc.store,
      url: doc.url,
      description: doc.description,
      type: doc.type,
      startDate: doc.startDate,
      endDate: doc.endDate,
    }));
  } catch (err) {
    console.error("Error fetching games from Appwrite:", err);
    throw err;
  }
};

// Countdown Timer
const CountdownTimer = memo(({ t, startDate }) => {
  const timeLeft = useCountdown(startDate, 1000);

  if (!timeLeft) return null;

  return (
    <View style={styles.countdownOverlay}>
      <LinearGradient
        colors={["rgba(81, 105, 150, 0.9)", "rgba(12, 26, 51, 0.8)"]}
        style={styles.countdownGradient}
      >
        <Text style={styles.countdownTitle}>{t("games.freeGames.freeOn")}</Text>

        <View style={styles.timerContainer}>
          <TimeUnit value={timeLeft.days} label={t("games.freeGames.days")} />
          <Text style={styles.separator}>:</Text>
          <TimeUnit value={timeLeft.hours} label={t("games.freeGames.hours")} />
          <Text style={styles.separator}>:</Text>
          <TimeUnit
            value={timeLeft.minutes}
            label={t("games.freeGames.minutes")}
          />
          <Text style={styles.separator}>:</Text>
          <TimeUnit
            value={timeLeft.seconds}
            label={t("games.freeGames.seconds")}
          />
        </View>
      </LinearGradient>
    </View>
  );
});

const TimeUnit = ({ value, label }) => (
  <View style={styles.timeUnit}>
    <View style={styles.timeValueBox}>
      <Text style={styles.timeValue}>{value}</Text>
    </View>
    <Text style={styles.timeLabel}>{label}</Text>
  </View>
);

// Main Component
function FreeGames() {
  const { t } = useTranslation();
  const [notifEnabled, setNotifEnabled] = useState(false);
  const userId = auth().currentUser?.uid;

  // cache
  const { data: gamesList, isLoading } = useCachedData(
    FREE_GAMES_CACHE_KEY,
    fetchFreeGamesFromAppwrite,
    [],
  );

  useEffect(() => {
    checkNotificationStatus();
  }, [userId]);

  const checkNotificationStatus = async () => {
    if (!userId) return;
    try {
      const prefs = await NotificationService.getUserPreferences(userId);
      const topicName = NotificationService.getTopicName(
        NOTIF_CATEGORY,
        NOTIF_SOURCE,
      );

      if (prefs[topicName] === true) {
        setNotifEnabled(true);
      } else {
        setNotifEnabled(false);
      }
    } catch (e) {
      console.log("Error reading pref from Firestore", e);
    }
  };

  const toggleNotifications = async () => {
    if (!userId) {
      ToastAndroid.show(t("common.loginRequired"), ToastAndroid.LONG);
      return;
    }

    const newStatus = !notifEnabled;
    setNotifEnabled(newStatus);

    try {
      await NotificationService.toggleNotificationPreference(
        userId,
        NOTIF_CATEGORY,
        NOTIF_SOURCE,
        newStatus,
      );

      if (newStatus) {
        ToastAndroid.show(t("games.freeGames.subscribed"), ToastAndroid.LONG);
      } else {
        ToastAndroid.show(t("games.freeGames.unsubscribed"), ToastAndroid.LONG);
      }
    } catch (error) {
      console.error("Toggle error:", error);
      setNotifEnabled(!newStatus);
      ToastAndroid.show(t("error"), ToastAndroid.LONG);
    }
  };

  const renderGameItem = useCallback(
    ({ item }) => {
      let StoreIcon = null;
      if (item.store === "steam") {
        StoreIcon = require("../../assets/steam.png");
      } else {
        StoreIcon = require("../../assets/epic-games.png");
      }

      return (
        <View style={styles.gameCard}>
          {/* linear background */}
          <LinearGradient
            colors={["#1a3052", "#0c1a33"]}
            style={styles.cardGradient}
          />

          {/* countdown timer */}
          <View style={styles.imageContainer}>
            {item.type === "next" && item.startDate && (
              <CountdownTimer t={t} startDate={item.startDate} />
            )}

            <Image
              source={
                item.image
                  ? `https://wsrv.nl/?url=${item.image}&w=400&q=80&output=webp`
                  : require("../../assets/image-not-found.webp")
              }
              style={styles.cover}
              contentFit="cover"
              cachePolicy="memory-disk"
            />

            {/* Gradient overlay for image */}
            <LinearGradient
              colors={["transparent", COLORS.darkBackground + "99"]}
              style={styles.imageGradient}
            />

            {/* Store Icon Badge */}
            <View style={styles.storeIconBadge}>
              <Image
                source={StoreIcon}
                style={{ width: 20, height: 20 }}
                contentFit="contain"
              />
            </View>
          </View>

          {/* game title */}
          <View style={styles.infoSection}>
            <Text
              style={styles.title}
              numberOfLines={item.type === "current" ? 2 : 4}
            >
              {item.title}
            </Text>

            {/* claim button */}
            {item.type === "current" && (
              <TouchableOpacity
                style={styles.savingsContainer}
                onPress={async () => {
                  try {
                    await analytics().logEvent("click_free_game", {
                      item_id: item.id,
                      item_name: item.title,
                      content_type: "free_game_card",
                      game_type: item.type,
                      store: item.store || "epic",
                    });
                  } catch (error) {
                    console.log("Analytics Error:", error);
                  }

                  if (item.url) {
                    Linking.openURL(item.url);
                  } else if (item.slug) {
                    Linking.openURL(
                      `https://store.epicgames.com/en-US/p/${item.slug}`,
                    );
                  }
                }}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={[COLORS.lightGray, "#516996"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.savingsButton}
                >
                  <Ionicons
                    name="gift-outline"
                    size={16}
                    color={COLORS.textLight}
                  />
                  <Text style={styles.savingsText}>
                    {t("games.freeGames.claimNow")}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </View>
      );
    },
    [t],
  );

  return (
    <View>
      {/* Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.header}>{t("games.freeGames.header")}</Text>
        <TouchableOpacity
          onPress={toggleNotifications}
          style={styles.bellButton}
        >
          <Ionicons
            name={notifEnabled ? "notifications" : "notifications-off-outline"}
            size={24}
            color={COLORS.textLight}
          />
        </TouchableOpacity>
      </View>
      {/* Games List */}
      {isLoading && gamesList?.length === 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[1, 2, 3].map((item) => (
            <SkeletonFreeGames key={item} />
          ))}
        </ScrollView>
      ) : (
        <FlatList
          data={gamesList || []}
          renderItem={renderGameItem}
          keyExtractor={(item) => item.id}
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          snapToInterval={185}
          decelerationRate="fast"
        />
      )}
    </View>
  );
}

export default FreeGames;

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "space-between",
    margin: 18,
  },
  header: {
    fontSize: 28,
    color: COLORS.textLight,
    fontWeight: "bold",
  },
  bellButton: {
    padding: 10,
    backgroundColor: COLORS.secondary + "80",
    borderRadius: 12,
  },
  listContent: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  gameCard: {
    width: 165,
    height: 300,
    marginHorizontal: 5,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    outlineWidth: 2,
    outlineColor: COLORS.darkBackground,
  },
  cardGradient: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  imageContainer: {
    width: "100%",
    height: 200,
    position: "relative",
  },
  cover: {
    width: "100%",
    height: "100%",
  },
  imageGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "40%",
  },
  storeIconBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: "rgba(12, 26, 51, 0.9)",
    borderRadius: 50,
    padding: 6,
    borderWidth: 1,
    borderColor: "#516996",
  },
  infoSection: {
    flex: 1,
    padding: 12,
    justifyContent: "space-between",
  },
  title: {
    color: COLORS.textLight,
    fontSize: 15,
    fontWeight: "bold",
    lineHeight: 18,
    textAlign: "center",
  },
  savingsContainer: {
    marginTop: 8,
  },
  savingsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 6,
    elevation: 3,
    shadowColor: COLORS.lightGray,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
  },
  savingsText: {
    color: COLORS.textLight,
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  // Countdown Overlay Styles
  countdownOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  countdownGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  comingSoonBadge: {
    backgroundColor: "rgba(119, 155, 221, 0.3)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    marginBottom: 12,
  },
  comingSoonText: {
    color: COLORS.lightGray,
    fontSize: 11,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  countdownTitle: {
    color: COLORS.textLight,
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  timeUnit: {
    alignItems: "center",
  },
  timeValueBox: {
    backgroundColor: "rgba(119, 155, 221, 0.25)",
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    minWidth: 32,
  },
  timeValue: {
    color: COLORS.textLight,
    fontWeight: "bold",
    textAlign: "center",
  },
  timeLabel: {
    color: "#9CB4DD",
    fontSize: 8,
    marginTop: 3,
    textAlign: "center",
    textTransform: "uppercase",
  },
  separator: {
    color: COLORS.lightGray,
    fontSize: 16,
    fontWeight: "bold",
    marginHorizontal: 2,
  },
  sparkle: {
    position: "absolute",
    top: 8,
    right: 8,
    fontSize: 20,
  },
});
