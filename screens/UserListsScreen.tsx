import React, { useState, useEffect, useCallback, memo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  ToastAndroid,
  Modal,
  StyleSheet,
  InteractionManager,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import auth from "@react-native-firebase/auth";
import firestore, { FirebaseFirestoreTypes } from "@react-native-firebase/firestore";
import COLORS from "../constants/colors";
import { useTranslation } from "react-i18next";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
import { adUnitId } from "../constants/config";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

// Types
type ListType = "default" | "custom";
interface GameList {
  id: string;
  name: string;
  type: ListType;
  createdAt?: FirebaseFirestoreTypes.Timestamp;
}
type StackParamList = {
  UserListsScreen: undefined;
  UserGamesScreen: { listId: string; listName: string };
};
type Props = NativeStackScreenProps<StackParamList, "UserListsScreen">;

// Default lists
const DEFAULT_LISTS: { id: string; name: string; type: ListType }[] = [
  { id: "played", name: "Played", type: "default" },
  { id: "wantToPlay", name: "Want to Play", type: "default" },
  { id: "playing", name: "Playing", type: "default" },
];

// main 
const UserListsScreen: React.FC<Props> = ({ navigation }) => {
  const [lists, setLists] = useState<GameList[]>([]);
  const [newListName, setNewListName] = useState<string>("");
  const [isModalVisible, setModalVisible] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [showAds, setShowAds] = useState<boolean>(false);
  const user = auth().currentUser;
  const { t } = useTranslation();

  // Ad 
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => setShowAds(true));
    return () => task.cancel();
  }, []);

  // i18n list name
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

  // Firestore init + listener

  useEffect(() => {
    if (!user) return;

    const listsRef = firestore()
      .collection("users").doc(user.uid).collection("lists");

    const initDefaults = async (): Promise<void> => {
      const snap = await listsRef.get();
      if (!snap.empty) return;
      const batch = firestore().batch();
      DEFAULT_LISTS.forEach(({ id, name, type }) => {
        batch.set(listsRef.doc(id), {
          name,
          type,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
      });
      await batch.commit();
    };

    initDefaults();

    const unsub = listsRef.orderBy("createdAt", "asc").onSnapshot((snap) => {
      setLists(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<GameList, "id">) }))
      );
    });

    return () => unsub();
  }, [user]);

  // Create list
  const handleCreateList = useCallback(async (): Promise<void> => {
    const trimmed = newListName.trim();
    if (!trimmed) return;

    const exists = lists.some((l) => l.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      ToastAndroid.show(
        t("userLists.errors.listAlreadyExists") ?? "A list with this name already exists",
        ToastAndroid.LONG
      );
      return;
    }

    const currentUser = auth().currentUser;
    if (!currentUser) return;

    setIsCreating(true);
    try {
      const ref = firestore()
        .collection("users").doc(currentUser.uid).collection("lists").doc();
      await ref.set({
        name: trimmed,
        type: "custom",
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
      setNewListName("");
      setModalVisible(false);
    } catch (error) {
      console.error("[UserListsScreen] Create list error:", error);
      ToastAndroid.show(t("userLists.errors.couldNotCreateList"), ToastAndroid.LONG);
    } finally {
      setIsCreating(false);
    }
  }, [newListName, lists, t]);

  // Delete list
  const handleDeleteList = useCallback(
    (listId: string, listName: string): void => {
      if (!user) return;
      Alert.alert(
        t("userLists.actions.confirmDeleteTitle"),
        t("userLists.actions.confirmDeleteMessage", { gameName: listName }),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("common.remove"),
            style: "destructive",
            onPress: async () => {
              await firestore()
                .collection("users").doc(user.uid)
                .collection("lists").doc(listId).delete();
            },
          },
        ]
      );
    },
    [user, t]
  );

  // Render item
  const renderItem = useCallback(
    ({ item, index }: { item: GameList; index: number }) => {
      const showAd =
        showAds &&
        ((index + 1) % 4 === 0 || (lists.length < 4 && index === lists.length - 1));
      return (
        <>
          <TouchableOpacity
            style={styles.listItem}
            onPress={() => navigation.navigate("UserGamesScreen", { listId: item.id, listName: item.name })}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons
                name={item.type === "default" ? "list" : "folder-open-outline"}
                size={24}
                color={COLORS.lightGray}
              />
              <Text style={styles.listName}>{getDisplayName(item.name)}</Text>
            </View>
            {item.type === "custom" && (
              <TouchableOpacity onPress={() => handleDeleteList(item.id, item.name)}>
                <Ionicons name="trash-outline" size={20} color="red" />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
          {showAd && (
            <View style={styles.ad}>
              <Text style={styles.adText}>{t("common.ad")}</Text>
              <BannerAd unitId={adUnitId} size={BannerAdSize.MEDIUM_RECTANGLE} />
            </View>
          )}
        </>
      );
    },
    [showAds, lists.length, getDisplayName, handleDeleteList, navigation, t]
  );

  // Footer
  const ListFooter = useCallback(
    () => (
      <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addListBtn}>
        <Text style={styles.addListText}>{t("userLists.actions.createNewList")}</Text>
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>
    ),
    [t]
  );

  return (
    <SafeAreaView style={styles.container} edges={["right", "left"]}>
      <FlashList
        data={lists}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListFooterComponent={<ListFooter />}
        contentContainerStyle={{ paddingVertical: 30 }}
        estimatedItemSize={75}
      />

      <Modal visible={isModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {t("userLists.actions.createNewList")}
              </Text>
              <TextInput
                style={styles.input}
                value={newListName}
                onChangeText={setNewListName}
                placeholder={t("userLists.placeholders.newListName")}
                placeholderTextColor="#999"
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={styles.cancelBtn}
                >
                  <Text style={styles.textBtn}>{t("common.cancel")}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleCreateList}
                  style={styles.createBtn}
                  disabled={isCreating}
                >
                  <Text style={styles.textBtn}>{t("common.create")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};
export default UserListsScreen;

const styles = StyleSheet.create({
  container: { backgroundColor: COLORS.primary },
  listItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
    backgroundColor: "rgba(119, 155, 221, 0.1)",
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  listName: { color: COLORS.textLight, fontSize: 18, marginLeft: 10 },
  ad: {
    alignItems: "center",
    width: "100%",
    marginVertical: 30,
  },
  adText: {
    color: "#fff",
    marginBottom: 10,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  modalContent: {
    backgroundColor: COLORS.primary,
    margin: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.secondary + "80",
  },
  modalTitle: {
    color: COLORS.textLight,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
  },
  input: {
    backgroundColor: COLORS.button,
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
    color: COLORS.textLight,
  },
  addListBtn: {
    padding: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.secondary,
    marginTop: 16,
    borderRadius: 8,
    marginHorizontal: 70,
  },
  addListText: {
    color: COLORS.textLight,
    fontSize: 16,
    fontWeight: "bold",
  },
  modalButtons: { flexDirection: "row", justifyContent: "space-around" },
  cancelBtn: { padding: 10, fontWeight: "bold" },
  createBtn: {
    backgroundColor: COLORS.secondary,
    padding: 10,
    borderRadius: 8,
    paddingHorizontal: 20,
    fontWeight: "semibold",
  },
  textBtn: {
    color: COLORS.textLight,
    fontWeight: "bold",
    fontSize: 16,
  },
});
