import React, { useCallback } from "react";
import {
  Text,
  StyleSheet,
  TouchableOpacity,
  View,
  FlatList,
  ListRenderItemInfo,
} from "react-native";
import { Image } from "expo-image";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { LinearGradient } from "expo-linear-gradient";
import COLORS from "../../constants/colors";

interface NewsGame {
  id: string;
  name: string;
  image: string;
  apiUrl: string;
  source?: string;
}

const GAMES_DATA: NewsGame[] = [
  {
    id: "1",
    name: "League of Legends",
    image: "https://newzoo.com/wp-content/uploads/api/games/artworks/game--league-of-legends.jpg",
    apiUrl: "https://news.google.com/rss/search?q=league%20of%20legends%20news&hl=",
    source: "https://www.leagueoflegends.com/news/",
  },
  {
    id: "2",
    name: "Valorant",
    image: "https://cmsassets.rgpub.io/sanity/images/dsfx7636/news_live/f657721a7eb06acae52a29ad3a951f20c1e5fc60-1920x1080.jpg",
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
    image: "https://file.booster.gearupportal.com/file/689ef73d36a337f883dbcddeI0uOdssK03.png?fop=imageView/2/w/280/f/webp",
    apiUrl: "https://games-news-api.vercel.app/eafc/",
    source: "https://www.ea.com/en/games/ea-sports-fc/fc-26/news",
  },
  {
    id: "5",
    name: "Marvel Rivals",
    image: "https://m.media-amazon.com/images/M/MV5BMDExODM1MjItNDA1Zi00NGQ3LTkwYTctNmFhODhkNjRmNzJkXkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg",
    apiUrl: "https://games-news-api.vercel.app/marvelRivals/",
    source: "https://www.marvelrivals.com/news/",
  },
];

// Card

interface NewsGameCardProps {
  item: NewsGame;
  onPress: (name: string, apiUrl: string, source?: string) => void;
}

const NewsGameCard = React.memo<NewsGameCardProps>(({ item, onPress }) => (
  <TouchableOpacity
    style={styles.gameCard}
    onPress={() => onPress(item.name, item.apiUrl, item.source)}
    activeOpacity={0.9}
  >
    <LinearGradient colors={["#1a3052", "#0c1a33"]} style={styles.cardGradient} />

    <View style={styles.imageContainer}>
      <Image
        recyclingKey={item.image}
        source={item.image}
        style={styles.cover}
        contentFit="cover"
        transition={500}
        cachePolicy="memory-disk"
        allowDownscaling={true}
      />
      <LinearGradient
        colors={["transparent", COLORS.darkBackground + "99"]}
        style={styles.coverGradient}
      />
    </View>

    <View style={styles.infoSection}>
      <Text style={styles.title} numberOfLines={2}>
        {item.name}
      </Text>
    </View>

    {/* Live indicator badge */}
    <View style={styles.liveIndicator}>
      <View style={styles.liveDot} />
      <Text style={styles.liveText}>LIVE</Text>
    </View>
  </TouchableOpacity>
));

// main

function GamesNews(): React.ReactElement {
  const navigation = useNavigation<any>();
  const { t } = useTranslation();

  const handleGamePress = useCallback(
    (gameName: string, apiUrl: string, source?: string): void => {
      navigation.navigate("GameNewsScreen", { gameName, apiUrl, source });
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<NewsGame>) => (
      <NewsGameCard item={item} onPress={handleGamePress} />
    ),
    [handleGamePress],
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>{t("games.list.gamesNews")}</Text>
      </View>

      <FlatList
        data={GAMES_DATA}
        horizontal={true}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        snapToInterval={175}
        decelerationRate="fast"
      />
    </View>
  );
}

export default GamesNews;

const styles = StyleSheet.create({
  container: {},
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "space-between",
    margin: 18,
  },
  header: { fontSize: 28, color: COLORS.textLight, fontWeight: "bold" },
  listContent: { paddingHorizontal: 10, paddingVertical: 5 },
  gameCard: {
    width: 165,
    height: 300,
    marginHorizontal: 5,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  cardGradient: { position: "absolute", width: "100%", height: "100%" },
  imageContainer: { width: "100%", height: 250, position: "relative" },
  cover: { width: "100%", height: "100%" },
  coverGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "50%",
  },
  infoSection: { flex: 1, padding: 12, justifyContent: "space-between" },
  title: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
    lineHeight: 18,
    textAlign: "center",
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