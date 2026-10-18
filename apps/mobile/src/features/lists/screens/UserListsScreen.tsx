import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshControl, TouchableOpacity, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { SafeAreaView } from "react-native-safe-area-context";
import { CirclePlus } from "lucide-react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useBottomInset } from "@/src/hooks/useBottomInset";
import { useScrollDirection } from "@/src/hooks/useScrollDirection";
import { useAuthUser } from "@/src/hooks/useAuthUser";
import { useAdsEnabled } from "@/src/hooks/useAdsEnabled";
import SkeletonUserLists from "../skeleton/SkeletonUserLists";
import UserListRow from "../components/userLists/UserListRow";
import AdSlot from "@/src/components/AdSlot";
import CreateListModal from "../components/userLists/CreateListModal";
import LoginRequiredView from "../components/shared/LoginRequiredView";
import { useUserLists } from "../hooks/useUserLists";
import { useDeferredMount } from "../hooks/useDeferredMount";
import { useListDisplayName } from "../hooks/useListDisplayName";
import { AD_INTERVAL } from "../constants";
import type { UserList } from "../types";

// Local navigation shape for this screen only — intentionally kept separate
// from the `StackParamList` in `../types`, which describes UserGamesScreen.
type StackParamList = {
  UserListsScreen: undefined;
  UserGamesScreen: { listId: string; listName: string };
};
type Props = NativeStackScreenProps<StackParamList, "UserListsScreen">;

const UserListsScreen = ({ navigation }: Props) => {
  const { user, isAnonymous } = useAuthUser();
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = useThemeStyles((c) => ({
    container: { flex: 1, backgroundColor: c.background },
    emptyState: {
      alignItems: "center" as const,
      paddingHorizontal: 32,
      marginTop: 56,
    },
    emptyTitle: {
      color: c.text,
      fontSize: 18,
      fontWeight: "600" as const,
      textAlign: "center" as const,
      marginBottom: 8,
    },
    emptyMessage: {
      color: c.textMuted,
      fontSize: 14,
      textAlign: "center" as const,
      marginBottom: 20,
      lineHeight: 20,
    },
    emptyButton: {
      backgroundColor: c.accent,
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 24,
    },
    emptyButtonText: {
      color: c.onAccent,
      fontSize: 15,
      fontWeight: "600" as const,
    },
  }));

  const adsEnabled = useAdsEnabled();
  // Deferred until after the first paint: gates the skeleton → list swap and
  // whether ads start loading.
  const isReady = useDeferredMount();
  const getDisplayName = useListDisplayName();
  const { onScroll } = useScrollDirection();
  const bottomInset = useBottomInset();
  const { lists, createList, isCreating, deleteList, error, refreshing, refresh } =
    useUserLists();

  // Create-list modal draft (owned here so the parent can clear/close it).
  const [isModalVisible, setModalVisible] = useState<boolean>(false);
  const [newListName, setNewListName] = useState<string>("");
  const [newListDescription, setNewListDescription] = useState<string>("");

  // Header button
  useEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        user && !isAnonymous ? (
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            style={{ padding: 6, marginRight: 6 }}
          >
            <CirclePlus size={28} color={colors.text} />
          </TouchableOpacity>
        ) : null,
    });
  }, [navigation, user, isAnonymous, colors.text]);

  const handleCreateList = useCallback(async (): Promise<void> => {
    const created = await createList(newListName, newListDescription);
    if (created) {
      setNewListName("");
      setNewListDescription("");
      setModalVisible(false);
    }
  }, [createList, newListName, newListDescription]);

  const handleCancelCreate = useCallback(() => setModalVisible(false), []);

  const renderItem = useCallback(
    ({ item, index }: { item: UserList; index: number }) => {
      const showAd =
        isReady &&
        adsEnabled &&
        ((index + 1) % AD_INTERVAL === 0 ||
          (lists.length < AD_INTERVAL && index === lists.length - 1));
      return (
        <>
          <UserListRow
            item={item}
            displayName={getDisplayName(item.name)}
            onPress={() =>
              navigation.navigate("UserGamesScreen", {
                listId: item.id,
                listName: item.name,
              })
            }
            onDelete={
              item.type === "custom"
                ? () => deleteList(item.id, item.name)
                : undefined
            }
          />
          {showAd && <AdSlot marginVertical={30} />}
        </>
      );
    },
    [isReady, adsEnabled, lists.length, getDisplayName, deleteList, navigation],
  );

  // The FlashList must not blank-screen: a failed snapshot subscription shows
  // an error state, an authenticated user with nothing yet gets an empty state.
  const renderListEmpty = useMemo(() => {
    if (error) {
      return (
        <View style={styles.emptyState}>
          <CustomText style={styles.emptyTitle}>
            {t("common.dataLoadError")}
          </CustomText>
          <CustomText style={styles.emptyMessage}>
            {t("common.pullToRefresh")}
          </CustomText>
        </View>
      );
    }
    return (
      <View style={styles.emptyState}>
        <CustomText style={styles.emptyTitle}>
          {t("userLists.noListsCreated.title")}
        </CustomText>
        <CustomText style={styles.emptyMessage}>
          {t("userLists.noListsCreated.message")}
        </CustomText>
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t("userLists.actions.createNewList")}
        >
          <CustomText style={styles.emptyButtonText}>
            {t("userLists.actions.createNewList")}
          </CustomText>
        </TouchableOpacity>
      </View>
    );
    // modalVisible is intentionally omitted: the button's onPress opens the
    // modal, but its visibility never changes what these nodes render.
  }, [error, styles, t]);

  if (isAnonymous || !user) {
    return (
      <SafeAreaView style={styles.container} edges={["right", "left"]}>
        <LoginRequiredView />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["right", "left"]}>
      {!isReady ? (
        <SkeletonUserLists />
      ) : (
        <FlashList
          data={lists}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={renderListEmpty}
          contentContainerStyle={{ paddingTop: 15, paddingBottom: bottomInset }}
          onScroll={onScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
        />
      )}
      <CreateListModal
        visible={isModalVisible}
        name={newListName}
        description={newListDescription}
        isCreating={isCreating}
        onChangeName={setNewListName}
        onChangeDescription={setNewListDescription}
        onCancel={handleCancelCreate}
        onSubmit={handleCreateList}
      />
    </SafeAreaView>
  );
};

export default UserListsScreen;
