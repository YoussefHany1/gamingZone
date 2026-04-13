import React, { useState, useEffect, useRef, useCallback, memo } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert,
  ToastAndroid, InteractionManager,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp, NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
import { adUnitId } from "../constants/config";
import UserGamesSkeleton from "../skeleton/SkeletonUserGames";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { useTranslation } from "react-i18next";
import COLORS from "../constants/colors";

// Types
interface GameEntry {
  id: string | number;
  name: string;
  cover_image_id?: string | null;
  release_date?: string;
}
type StackParamList = {
  UserGamesScreen: { listId: string; listName: string };
  GameDetails: { gameID: string | number };
  Games: undefined;
};
type Props = NativeStackScreenProps<StackParamList, "UserGamesScreen">;

// GameItem
interface GameItemProps {
  game: GameEntry;
  onRemove: (id: string | number, name: string) => void;
}

const GameItem = memo<GameItemProps>(({ game, onRemove }) => {
  const navigation = useNavigation<NativeStackNavigationProp<StackParamList>>();

  const coverUrl = game.cover_image_id
    ? { uri: `https://images.igdb.com/igdb/image/upload/t_cover_small/${game.cover_image_id}.jpg` }
    : require("../assets/image-not-found.webp");

  const handlePress = useCallback(
    () => navigation.navigate("GameDetails", { gameID: game.id }),
    [game.id, navigation]
  );

  const handleRemove = useCallback(
    () => onRemove(game.id, game.name),
    [game.id, game.name, onRemove]
  );

  return (
    <TouchableOpacity style={styles.gameItemContainer} onPress={handlePress}>
      <Image
        recyclingKey={String(game.cover_image_id ?? "")}
        source={coverUrl}
        style={styles.gameImage}
        contentFit="cover"
        transition={500}
        cachePolicy="memory-disk"
        allowDownscaling
      />
      <View style={styles.gameInfo}>
        <Text style={styles.gameName} numberOfLines={2}>{game.name}</Text>
        <Text style={styles.gameReleaseDate}>{String(game.release_date ?? "")}</Text>
      </View>
      <TouchableOpacity style={styles.removeButton} onPress={handleRemove}>
        <Ionicons name="trash-outline" size={24} color="#FF6347" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
});
GameItem.displayName = "GameItem";

// main

const UserGamesScreen: React.FC<Props> = ({ route, navigation }) => {
  const { listId, listName } = route.params;
  const [games, setGames] = useState<GameEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAds, setShowAds] = useState<boolean>(false);
  const mountedRef = useRef<boolean>(true);
  const { t } = useTranslation();
  const currentUser = auth().currentUser;

  const CACHE_KEY = currentUser ? `USER_GAMES_${currentUser.uid}_LIST_${listId}` : null;

  // List name i18n

  const getDisplayName = useCallback(
    (name: string): string => {
      const map: Record<string, string> = {
        Playing: t("games.details.listStatus.playing"),
        Played: t("games.details.listStatus.played"),
        "Want to Play": t("games.details.listStatus.wantToPlay"),
      };
      return map[name] ?? name;
    },
    [t]
  );

  // Effects

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => setShowAds(true));
    return () => task.cancel();
  }, []);

  useEffect(() => {
    navigation.setOptions({ title: getDisplayName(listName) });
  }, [listName, getDisplayName, navigation]);

  useEffect(() => {
    mountedRef.current = true;
    if (!currentUser || !CACHE_KEY) { setLoading(false); return; }

    let unsubscribe: () => void = () => { };

    const init = async (): Promise<void> => {
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached && mountedRef.current) {
          const parsed: GameEntry[] = JSON.parse(cached);
          if (parsed.length > 0) { setGames(parsed); setLoading(false); }
        }
      } catch (e) { console.error("[UserGamesScreen] Cache read failed", e); }

      const netState = await NetInfo.fetch();
      if (!netState.isConnected && mountedRef.current) { setLoading(false); }

      const colRef = firestore()
        .collection("users").doc(currentUser.uid)
        .collection("lists").doc(listId)
        .collection("games");

      unsubscribe = colRef.onSnapshot(
        (snap) => {
          if (!mountedRef.current) return;
          const list: GameEntry[] = snap.docs.map((d) => ({ ...(d.data() as GameEntry), id: d.id }));
          setGames(list);
          setLoading(false);
          AsyncStorage.setItem(CACHE_KEY, JSON.stringify(list)).catch(console.error);
        },
        (error) => {
          console.error("[UserGamesScreen] Snapshot error:", error);
          if (mountedRef.current) setLoading(false);
          if (games.length === 0) ToastAndroid.show(t("settings.userGames.messages.loadError"), ToastAndroid.LONG);
        }
      );
    };

    init();
    return () => { mountedRef.current = false; unsubscribe(); };
  }, [currentUser, listId, CACHE_KEY]);

  // Handlers
  const handleRemoveGame = useCallback(
    (gameId: string | number, gameName: string): void => {
      if (!currentUser || !CACHE_KEY) return;
      Alert.alert(
        t("userLists.actions.confirmDeleteTitle"),
        t("userLists.actions.confirmDeleteMessage", { gameName }),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("common.remove"),
            style: "destructive",
            onPress: async () => {
              const gameIdStr = String(gameId);
              const oldGames = [...games];
              const newGames = games.filter((g) => String(g.id) !== gameIdStr);
              setGames(newGames);
              AsyncStorage.setItem(CACHE_KEY, JSON.stringify(newGames)).catch(console.error);
              try {
                await firestore()
                  .collection("users").doc(currentUser.uid)
                  .collection("lists").doc(listId)
                  .collection("games").doc(gameIdStr).delete();
              } catch {
                setGames(oldGames);
                AsyncStorage.setItem(CACHE_KEY, JSON.stringify(oldGames)).catch(console.error);
                ToastAndroid.show(t("settings.userGames.messages.removeError"), ToastAndroid.LONG);
              }
            },
          },
        ]
      );
    },
    [currentUser, CACHE_KEY, games, listId, t]
  );

  // Empty list
  const renderEmptyList = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <Ionicons name="bookmark-outline" size={80} color={COLORS.primary} />
        <Text style={styles.emptyText}>{t("settings.userGames.emptyText")}</Text>
        <Text style={styles.emptySubText}>{t("settings.userGames.emptySubText")}</Text>
        <TouchableOpacity onPress={() => navigation.navigate("Games")} style={styles.findGameButton}>
          <Text style={styles.findGameText}>{t("settings.userGames.findButton")}</Text>
        </TouchableOpacity>
      </View>
    ),
    [t, navigation]
  );

  // Render item
  const renderItem = useCallback(
    ({ item, index }: { item: GameEntry; index: number }) => {
      const showAd =
        showAds &&
        ((index + 1) % 4 === 0 || (games.length < 4 && index === games.length - 1));
      return (
        <>
          <GameItem game={item} onRemove={handleRemoveGame} />
          {showAd && (
            <View style={styles.ad}>
              <Text style={styles.adText}>{t("common.ad")}</Text>
              <BannerAd unitId={adUnitId} size={BannerAdSize.MEDIUM_RECTANGLE} />
            </View>
          )}
        </>
      );
    },
    [showAds, games.length, handleRemoveGame, t]
  );

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      {loading && games.length === 0 ? (
        <UserGamesSkeleton />
      ) : (
        <FlatList
          data={games}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          ListEmptyComponent={renderEmptyList}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
        />
      )}
    </SafeAreaView>
  );
};

export default UserGamesScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyText: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 16,
  },
  emptySubText: {
    color: "gray",
    fontSize: 16,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 20,
  },
  findGameButton: {
    backgroundColor: COLORS.secondary,
    padding: 10,
    borderRadius: 16,
    marginTop: 28,
  },
  findGameText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  gameItemContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(119, 155, 221, 0.1)",
    borderRadius: 12,
    marginTop: 24,
    padding: 10,
    alignItems: "center",
  },
  gameImage: {
    width: 80,
    height: 105,
    borderRadius: 8,
  },
  gameInfo: {
    flex: 1,
    marginLeft: 12,
  },
  gameName: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  gameReleaseDate: {
    color: "gray",
    fontSize: 14,
    marginTop: 4,
  },
  removeButton: {
    padding: 8,
    marginLeft: 8,
  },
  ad: {
    alignItems: "center",
    width: "100%",
    marginVertical: 55,
  },
  adText: {
    color: "#fff",
    marginBottom: 10,
  },
});
