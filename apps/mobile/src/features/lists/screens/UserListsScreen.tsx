import React, { useCallback, useEffect, useState } from "react";
import { TouchableOpacity } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { SafeAreaView } from "react-native-safe-area-context";
import { CirclePlus } from "lucide-react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
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
  const colors = useThemeColors();
  const styles = useThemeStyles((c) => ({
    container: { flex: 1, backgroundColor: c.background },
  }));

  const adsEnabled = useAdsEnabled();
  // Deferred until after the first paint: gates the skeleton → list swap and
  // whether ads start loading.
  const isReady = useDeferredMount();
  const getDisplayName = useListDisplayName();
  const { onScroll } = useScrollDirection();
  const { lists, createList, isCreating, deleteList } = useUserLists();

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
          contentContainerStyle={{ paddingTop: 15, paddingBottom: 90 }}
          onScroll={onScroll}
          scrollEventThrottle={16}
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
