import React, { useCallback, useEffect } from "react";
import { View, TouchableOpacity, Share, RefreshControl } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { SafeAreaView } from "react-native-safe-area-context";
import { CirclePlus, Share2 } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useScrollDirection } from "@/src/hooks/useScrollDirection";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useAdsEnabled } from "@/src/hooks/useAdsEnabled";
import UserGamesSkeleton from "../skeleton/SkeletonUserGames";
import GameItem from "../components/userGames/GameItem";
import GamePosterItem from "../components/userGames/GamePosterItem";
import UserGamesNativeAd from "../components/userGames/UserGamesNativeAd";
import GamesListHeader from "../components/userGames/GamesListHeader";
import EmptyGamesList from "../components/userGames/EmptyGamesList";
import { useUserGames } from "../hooks/useUserGames";
import { useListEditing } from "../hooks/useListEditing";
import { useGameMutations } from "../hooks/useGameMutations";
import { useViewModePreference } from "../hooks/useViewModePreference";
import { useUserGamesRows } from "../hooks/useUserGamesRows";
import { useDeferredMount } from "../hooks/useDeferredMount";
import { useListDisplayName } from "../hooks/useListDisplayName";
import type { Props, UserGamesRow } from "../types";
import { logger } from "@/src/lib/logger";

const UserGamesScreen = ({ route, navigation }: Props) => {
  const { listId, listName, ownerId } = route.params;

  const { t } = useTranslation();
  const colors = useThemeColors();
  const { onScroll } = useScrollDirection();
  const adsEnabled = useAdsEnabled();
  // Deferred until after the first paint: gates the skeleton → list swap and
  // whether ads start loading.
  const isReady = useDeferredMount();
  const getDisplayName = useListDisplayName();
  const { viewMode, setViewMode } = useViewModePreference();

  const styles = useThemeStyles((c) => ({
    container: {
      flex: 1,
      backgroundColor: c.background,
      direction: "ltr",
    },
  }));

  const {
    games,
    setGames,
    setListMeta,
    loading,
    refreshing,
    refresh,
    isSharedList,
    targetUserId,
    cacheKey,
    canEdit,
    isSignedIn,
    displayTitle,
    displayDescription,
  } = useUserGames({ listId, listName, ownerId });

  // Title / description editing (owner of a custom list only)
  const handleSaved = useCallback(
    (name: string, description: string) => {
      setListMeta((prev) => ({
        id: listId,
        name,
        description,
        type: prev?.type ?? "custom",
      }));
    },
    [listId, setListMeta],
  );

  const {
    isEditing,
    draftTitle,
    draftDescription,
    isSaving,
    setDraftTitle,
    setDraftDescription,
    startEdit,
    cancelEdit,
    saveEdit,
  } = useListEditing({
    listId,
    targetUserId,
    canEdit,
    displayTitle,
    displayDescription,
    onSaved: handleSaved,
  });

  const { removeGame, rateGame } = useGameMutations({
    games,
    setGames,
    listId,
    targetUserId,
    cacheKey,
    isSharedList,
  });

  const handleShare = useCallback(async () => {
    try {
      const shareUrl = `https://gz1.games/lists/${listId}?ownerId=${targetUserId}&name=${encodeURIComponent(displayTitle)}`;
      const message = `${
        t("userLists.actions.shareMessage", {
          listName: getDisplayName(displayTitle),
        }) ?? `Check out my list "${getDisplayName(displayTitle)}" on Gaming Zone:`
      } ${shareUrl}`;

      await Share.share({
        message,
        url: shareUrl,
      });
    } catch (error) {
      logger.error("[UserGamesScreen] Share error:", error);
    }
  }, [listId, targetUserId, displayTitle, getDisplayName, t]);

  // Header: title + share/add buttons
  useEffect(() => {
    navigation.setOptions({
      title: getDisplayName(displayTitle),
      headerRight: () => (
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {targetUserId && games.length > 0 ? (
            <TouchableOpacity
              onPress={handleShare}
              style={{ marginRight: 12, padding: 6 }}
            >
              <Share2 size={24} color={colors.text} />
            </TouchableOpacity>
          ) : null}
          {!isSharedList && (
            <TouchableOpacity
              onPress={() => navigation.getParent()?.navigate("Games")}
              style={{ padding: 6 }}
            >
              <CirclePlus size={28} color={colors.text} />
            </TouchableOpacity>
          )}
        </View>
      ),
    });
  }, [
    displayTitle,
    getDisplayName,
    navigation,
    isSharedList,
    handleShare,
    targetUserId,
    games.length,
    colors.text,
  ]);

  // Interleave inline ad slots between games (every AD_INTERVAL) for both view
  // modes. The renderer decides how each slot looks: a poster-sized ad box in
  // grid view, or the standard full-width row in list view.
  const { rows, getItemType } = useUserGamesRows({
    games,
    showAds: isReady,
    adsEnabled,
  });

  // Render item — one root element per row (game or ad) in either view mode.
  const renderItem = useCallback(
    ({ item }: { item: UserGamesRow }) => {
      if (item.type === "ad") {
        return <UserGamesNativeAd viewMode={viewMode} />;
      }

      if (viewMode === "grid") {
        return (
          <GamePosterItem
            game={item.game}
            onRemove={isSharedList ? undefined : removeGame}
          />
        );
      }

      return (
        <GameItem
          game={item.game}
          onRemove={isSharedList ? undefined : removeGame}
          onRate={isSharedList ? undefined : rateGame}
        />
      );
    },
    [viewMode, removeGame, rateGame, isSharedList],
  );

  // Empty list
  const renderEmptyList = useCallback(() => {
    const isDefaultGameList = ["playing", "played", "wantToPlay"].includes(
      listId,
    );
    const showSteamSync =
      !isSharedList && isDefaultGameList && isSignedIn;

    return (
      <EmptyGamesList
        listId={listId}
        isSharedList={Boolean(isSharedList)}
        showSteamSync={showSteamSync}
        onFindGame={() => navigation.navigate("Games")}
      />
    );
  }, [listId, isSharedList, isSignedIn, navigation]);

  // Header: title + description (editable by the list owner)
  const listHeader = (
    <GamesListHeader
      title={getDisplayName(displayTitle)}
      description={displayDescription}
      canEdit={canEdit}
      isEditing={isEditing}
      draftTitle={draftTitle}
      draftDescription={draftDescription}
      isSaving={isSaving}
      isSharedList={Boolean(isSharedList)}
      showViewToggle={games.length > 0}
      viewMode={viewMode}
      onChangeDraftTitle={setDraftTitle}
      onChangeDraftDescription={setDraftDescription}
      onStartEdit={startEdit}
      onCancelEdit={cancelEdit}
      onSaveEdit={saveEdit}
      onChangeView={setViewMode}
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      {!isReady || (loading && games.length === 0) ? (
        <UserGamesSkeleton viewMode={viewMode} />
      ) : (
        <FlashList
          key={viewMode}
          data={rows}
          numColumns={viewMode === "grid" ? 3 : 1}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          getItemType={getItemType}
          ListEmptyComponent={renderEmptyList}
          ListHeaderComponent={listHeader}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 90 }}
          onScroll={onScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={colors.accentText}
              colors={[colors.accentText]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

export default UserGamesScreen;
