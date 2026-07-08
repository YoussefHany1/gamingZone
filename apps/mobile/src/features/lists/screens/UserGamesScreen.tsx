import React, { useState, useEffect, useRef, useCallback, memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ToastAndroid,
  InteractionManager,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import { NativeAdComponent } from "@/src/components/NativeAd";
import UserGamesSkeleton from "../skeleton/SkeletonUserGames";
import { storageGet, storageSet } from "@/src/lib/storage";
import NetInfo from "@react-native-community/netinfo";
import { useTranslation } from "react-i18next";
import { useScrollDirection } from "@/src/hooks/useScrollDirection";
import COLORS from "@/src/constants/colors";
import type { GameItemProps, StackParamList, GameEntry, Props } from "../types";

const GameItem = memo<GameItemProps>(({ game, onRemove, onRate }) => {
  const navigation = useNavigation<NativeStackNavigationProp<StackParamList>>();

  const coverUrl = game.cover_image_id
    ? {
        uri: `https://images.igdb.com/igdb/image/upload/t_cover_small/${game.cover_image_id}.webp`,
      }
    : require("@/assets/image-not-found.webp");

  const handlePress = useCallback(
    () => navigation.navigate("GameDetails", { gameID: game.id }),
    [game.id, navigation],
  );

  const handleRemove = useCallback(
    () => onRemove && onRemove(game.id, game.name),
    [game.id, game.name, onRemove],
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
        <Text style={styles.gameName} numberOfLines={2}>
          {game.name}
        </Text>
        <Text style={styles.gameReleaseDate}>
          {String(game.release_date ?? "")}
        </Text>
        <View style={styles.ratingRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() =>
                onRate && onRate(game.id, game.rating === star ? 0 : star)
              }
              disabled={!onRate}
              activeOpacity={0.7}
              style={{ paddingRight: 4, paddingVertical: 4 }}
            >
              <Ionicons
                name={star <= (game.rating ?? 0) ? "star" : "star-outline"}
                size={18}
                color={
                  star <= (game.rating ?? 0) ? "#ffc107" : COLORS.lightGray
                }
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>
      {onRemove && (
        <TouchableOpacity style={styles.removeButton} onPress={handleRemove}>
          <Ionicons name="trash-outline" size={24} color="#FF6347" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
});
GameItem.displayName = "GameItem";

// main
const UserGamesScreen: React.FC<Props> = ({ route, navigation }) => {
  const { listId, listName, ownerId } = route.params;
  const [games, setGames] = useState<GameEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAds, setShowAds] = useState<boolean>(false);
  const [isReady, setIsReady] = useState<boolean>(false);
  const mountedRef = useRef<boolean>(true);
  const { t } = useTranslation();
  const { onScroll } = useScrollDirection();
  const currentUser = auth().currentUser;

  const isSharedList = ownerId && (!currentUser || ownerId !== currentUser.uid);
  const targetUserId = isSharedList
    ? ownerId
    : currentUser
      ? currentUser.uid
      : null;
  const CACHE_KEY = targetUserId
    ? `USER_GAMES_${targetUserId}_LIST_${listId}`
    : null;

  // List name i18n
  const getDisplayName = useCallback(
    (name: string): string => {
      const map: Record<string, string> = {
        Playing: t("games.details.listStatus.playing"),
        Played: t("games.details.listStatus.played"),
        "Want to Play": t("games.details.listStatus.wantToPlay"),
        Rated: t("games.details.listStatus.rated"),
      };
      return map[name] ?? name;
    },
    [t],
  );

  // Handlers
  const handleShare = useCallback(async () => {
    try {
      const shareUrl = `https://gz1.vercel.app/lists/${listId}?ownerId=${targetUserId}&name=${encodeURIComponent(listName)}`;
      const message = `${
        t("userLists.actions.shareMessage", {
          listName: getDisplayName(listName),
        }) ?? `Check out my list "${getDisplayName(listName)}" on Gaming Zone:`
      } ${shareUrl}`;

      const { Share } = require("react-native");
      await Share.share({
        message,
        url: shareUrl,
      });
    } catch (error) {
      console.error("[UserGamesScreen] Share error:", error);
    }
  }, [listId, targetUserId, listName, getDisplayName, t]);

  // Effects
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setShowAds(true);
      setIsReady(true);
    });
    return () => task.cancel();
  }, []);

  useEffect(() => {
    navigation.setOptions({
      title: getDisplayName(listName),
      headerRight: () => (
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {targetUserId && (
            <TouchableOpacity
              onPress={handleShare}
              style={{ marginRight: 12, padding: 6 }}
            >
              <Ionicons name="share-social-outline" size={24} color="#fff" />
            </TouchableOpacity>
          )}
          {!isSharedList && (
            <TouchableOpacity
              onPress={() => navigation.getParent()?.navigate("Games")}
              style={{ padding: 6 }}
            >
              <Ionicons name="add-circle-outline" size={28} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      ),
    });
  }, [
    listName,
    getDisplayName,
    navigation,
    isSharedList,
    handleShare,
    targetUserId,
  ]);

  useEffect(() => {
    mountedRef.current = true;
    if (!targetUserId) {
      setLoading(false);
      return;
    }

    let unsubscribe: () => void = () => {};

    const init = async (): Promise<void> => {
      try {
        if (CACHE_KEY) {
          // MMKV read is synchronous â€” no await needed
          const parsed = storageGet<GameEntry[]>(CACHE_KEY);
          if (parsed && parsed.length > 0 && mountedRef.current) {
            setGames(parsed);
            setLoading(false);
          }
        }
      } catch (e) {
        console.error("[UserGamesScreen] Cache read failed", e);
      }

      const netState = await NetInfo.fetch();
      if (!netState.isConnected && mountedRef.current) {
        setLoading(false);
      }

      const colRef = firestore()
        .collection("users")
        .doc(targetUserId)
        .collection("lists")
        .doc(listId)
        .collection("games");

      unsubscribe = colRef.onSnapshot(
        (snap) => {
          if (!mountedRef.current) return;
          const list: GameEntry[] = snap.docs.map((d) => ({
            ...(d.data() as GameEntry),
            id: d.id,
          }));
          setGames(list);
          setLoading(false);
          if (CACHE_KEY) {
            // Synchronous MMKV write â€” won't block the snapshot callback
            storageSet(CACHE_KEY, list);
          }
        },
        (error) => {
          console.error("[UserGamesScreen] Snapshot error:", error);
          if (mountedRef.current) setLoading(false);
          if (games.length === 0)
            ToastAndroid.show(
              t("settings.userGames.messages.loadError"),
              ToastAndroid.LONG,
            );
        },
      );
    };

    init();
    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, [targetUserId, listId, CACHE_KEY]);

  const handleRemoveGame = useCallback(
    (gameId: string | number, gameName: string): void => {
      if (isSharedList || !targetUserId || !CACHE_KEY) return;
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
              storageSet(CACHE_KEY, newGames);
              try {
                await firestore()
                  .collection("users")
                  .doc(targetUserId)
                  .collection("lists")
                  .doc(listId)
                  .collection("games")
                  .doc(gameIdStr)
                  .delete();

                if (listId === "rated") {
                  // Delete rating document
                  await firestore()
                    .collection("users")
                    .doc(targetUserId)
                    .collection("ratings")
                    .doc(gameIdStr)
                    .delete();

                  // Sync rating field in other lists
                  const listsRef = firestore()
                    .collection("users")
                    .doc(targetUserId)
                    .collection("lists");
                  const listsSnap = await listsRef.get();
                  for (const listDoc of listsSnap.docs) {
                    if (listDoc.id === "rated") continue;
                    const gRef = listDoc.ref.collection("games").doc(gameIdStr);
                    const gSnap = await gRef.get();
                    if (gSnap && gSnap.exists) {
                      try {
                        await gRef.update({
                          rating: firestore.FieldValue.delete(),
                        });
                      } catch (updateErr) {
                        console.log(
                          `[UserGamesScreen] Stale cache update handled for list ${listDoc.id}`,
                        );
                      }
                    }
                  }
                }
              } catch {
                setGames(oldGames);
                storageSet(CACHE_KEY, oldGames);
                ToastAndroid.show(
                  t("settings.userGames.messages.removeError"),
                  ToastAndroid.LONG,
                );
              }
            },
          },
        ],
      );
    },
    [isSharedList, targetUserId, CACHE_KEY, games, listId, t],
  );

  const handleRateGame = useCallback(
    async (gameId: string | number, newRating: number) => {
      if (!currentUser || currentUser.isAnonymous) return;
      const game = games.find((g) => String(g.id) === String(gameId));
      if (!game) return;

      const gameIdStr = String(gameId);
      const ratingRef = firestore()
        .collection("users")
        .doc(currentUser.uid)
        .collection("ratings")
        .doc(gameIdStr);

      const ratedGameRef = firestore()
        .collection("users")
        .doc(currentUser.uid)
        .collection("lists")
        .doc("rated")
        .collection("games")
        .doc(gameIdStr);

      try {
        if (newRating === 0) {
          await ratingRef.delete();
          await ratedGameRef.delete();
        } else {
          await firestore()
            .collection("users")
            .doc(currentUser.uid)
            .collection("lists")
            .doc("rated")
            .set(
              {
                name: "Rated",
                type: "default",
                createdAt: firestore.FieldValue.serverTimestamp(),
              },
              { merge: true },
            );

          await ratingRef.set({
            rating: newRating,
            updatedAt: firestore.FieldValue.serverTimestamp(),
          });
          await ratedGameRef.set({
            id: game.id,
            name: game.name,
            cover_image_id: game.cover_image_id ?? null,
            release_date: game.release_date ?? "N/A",
            rating: newRating,
            ratedAt: firestore.FieldValue.serverTimestamp(),
          });
        }

        // Sync rating field in any other lists containing this game
        const listsRef = firestore()
          .collection("users")
          .doc(currentUser.uid)
          .collection("lists");
        const listsSnap = await listsRef.get();
        for (const listDoc of listsSnap.docs) {
          if (listDoc.id === "rated") continue;
          const gRef = listDoc.ref.collection("games").doc(gameIdStr);
          const gSnap = await gRef.get();
          if (gSnap && gSnap.exists) {
            try {
              if (newRating === 0) {
                await gRef.update({ rating: firestore.FieldValue.delete() });
              } else {
                await gRef.update({ rating: newRating });
              }
            } catch (updateErr) {
              console.log(
                `[UserGamesScreen] Stale cache update handled for list ${listDoc.id}`,
              );
            }
          }
        }
      } catch (e) {
        console.error("Error rating game inside list:", e);
      }
    },
    [currentUser, games],
  );

  // Empty list
  const renderEmptyList = useCallback(() => {
    const emptySubText =
      listId === "rated"
        ? (t("userLists.empty.ratedSub") ??
          "Rate and review the games you have played here.")
        : t("settings.userGames.emptySubText");
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="bookmark-outline" size={80} color={COLORS.primary} />
        <Text style={styles.emptyText}>
          {t("settings.userGames.emptyText")}
        </Text>
        <Text style={styles.emptySubText}>{emptySubText}</Text>
        {!isSharedList && (
          <TouchableOpacity
            onPress={() => navigation.navigate("Games")}
            style={styles.findGameButton}
          >
            <Text style={styles.findGameText}>
              {t("settings.userGames.findButton")}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [t, navigation, isSharedList, listId]);

  // Render item
  const renderItem = useCallback(
    ({ item, index }: { item: GameEntry; index: number }) => {
      const showAd =
        showAds &&
        ((index + 1) % 4 === 0 ||
          (games.length < 4 && index === games.length - 1));

      return (
        <>
          <GameItem
            game={item}
            onRemove={isSharedList ? undefined : handleRemoveGame}
            onRate={isSharedList ? undefined : handleRateGame}
          />
          {showAd && <NativeAdComponent />}
        </>
      );
    },
    [showAds, games.length, handleRemoveGame, handleRateGame, isSharedList],
  );

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      {!isReady || (loading && games.length === 0) ? (
        <UserGamesSkeleton />
      ) : (
        <FlashList
          data={games}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          ListEmptyComponent={renderEmptyList}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 90 }}
          onScroll={onScroll}
          scrollEventThrottle={16}
          estimatedItemSize={150}
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
  ratingRow: {
    flexDirection: "row",
    marginTop: 4,
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
