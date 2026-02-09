import React, { useCallback } from "react";
import {
  Text,
  StyleSheet,
  TouchableOpacity,
  View,
  FlatList,
} from "react-native";
import { Image } from "expo-image";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { LinearGradient } from "expo-linear-gradient";
import COLORS from "../../constants/colors";

// البيانات
const GAMES_DATA = [
  {
    id: "1",
    name: "League of Legends",
    image:
      "https://newzoo.com/wp-content/uploads/api/games/artworks/game--league-of-legends.jpg",
    apiUrl: "https://games-news-api.vercel.app/lol/",
    source: "https://www.leagueoflegends.com/news/",
  },
  {
    id: "2",
    name: "Valorant",
    image:
      "https://cmsassets.rgpub.io/sanity/images/dsfx7636/news_live/f657721a7eb06acae52a29ad3a951f20c1e5fc60-1920x1080.jpg",
    apiUrl: "https://games-news-api.vercel.app/valorant/",
    source: "https://playvalorant.com/news/",
  },
  {
    id: "3",
    name: "Fortnite",
    image: "https://e.snmc.io/lk/f/x/8c434690de9afaac992d0c20fc870bfc/11579669",
    apiUrl: "https://fortnite-api.com/v2/news?language=",
  },
  {
    id: "4",
    name: "EA Sports FC 26",
    image:
      "https://file.booster.gearupportal.com/file/689ef73d36a337f883dbcddeI0uOdssK03.png?fop=imageView/2/w/280/f/webp",
    apiUrl: "https://games-news-api.vercel.app/eafc/",
    source: "https://www.ea.com/en/games/ea-sports-fc/fc-26/news",
  },
  {
    id: "5",
    name: "Marvel Rivals",
    image:
      "https://m.media-amazon.com/images/M/MV5BMDExODM1MjItNDA1Zi00NGQ3LTkwYTctNmFhODhkNjRmNzJkXkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg",
    apiUrl: "https://games-news-api.vercel.app/marvelRivals/",
    source: "https://www.marvelrivals.com/news/",
  },
];

// مكون البطاقة
const NewsGameCard = React.memo(({ item, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.gameCard}
      onPress={() => onPress(item.name, item.apiUrl, item.source)}
      activeOpacity={0.9}
    >
      {/* الخلفية المتدرجة */}
      <LinearGradient
        colors={["#1a3052", "#0c1a33"]}
        style={styles.cardGradient}
      />

      {/* الصورة */}
      <View style={styles.imageContainer}>
        <Image
          source={item.image}
          style={styles.cover}
          contentFit="cover"
          transition={500}
          cachePolicy="memory-disk"
        />

        {/* Overlay gradient */}
        <LinearGradient
          colors={["transparent", COLORS.darkBackground + "99"]}
          style={styles.coverGradient}
        />
      </View>

      <View style={styles.infoSection}>
        {/* game title*/}
        <Text style={styles.title} numberOfLines={2}>
          {item.name}
        </Text>
      </View>

      {/* Live indicator */}
      <View style={styles.liveIndicator}>
        <View style={styles.liveDot} />
        <Text style={styles.liveText}>LIVE</Text>
      </View>
    </TouchableOpacity>
  );
});

function GamesNews() {
  const navigation = useNavigation();
  const { t } = useTranslation();

  const handleGamePress = useCallback(
    (gameName, apiUrl, source) => {
      navigation.navigate("GameNewsScreen", { gameName, apiUrl, source });
    },
    [navigation],
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.header}>{t("games.list.gamesNews")}</Text>
      </View>

      {/* قائمة الألعاب */}
      <FlatList
        data={GAMES_DATA}
        horizontal={true}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NewsGameCard item={item} onPress={handleGamePress} />
        )}
        contentContainerStyle={styles.listContent}
        snapToInterval={175}
        decelerationRate="fast"
      />
    </View>
  );
}

export default GamesNews;

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
    height: 250,
    position: "relative",
  },
  cover: {
    width: "100%",
    height: "100%",
  },
  coverGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "50%",
  },
  infoSection: {
    flex: 1,
    padding: 12,
    justifyContent: "space-between",
  },
  title: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
    lineHeight: 18,
    textAlign: "center",
  },
  newsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 6,
    elevation: 3,
    shadowColor: "#779bdd",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
  },
  newsIcon: {
    fontSize: 14,
  },
  newsButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 0.3,
  },
  liveIndicator: {
    position: "absolute",
    top: 8,
    left: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(12, 26, 51, 0.9)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
    borderWidth: 1,
    borderColor: "#FF3B30",
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FF3B30",
  },
  liveText: {
    color: "#FF3B30",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
});
