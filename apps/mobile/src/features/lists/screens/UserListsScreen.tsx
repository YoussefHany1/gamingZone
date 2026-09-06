import React, { useState, useEffect, useCallback, memo } from "react";
import CustomText from "@/src/components/CustomText";
import {
  View,
  TouchableOpacity,
  Alert,
  ToastAndroid,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { runAfterInteractions } from "@/src/utils/runAfterInteractions";
import { FlashList } from "@shopify/flash-list";
import { SafeAreaView } from "react-native-safe-area-context";
import SkeletonUserLists from "../skeleton/SkeletonUserLists";
import { CirclePlus, FolderOpen, List, Trash2, TriangleAlert } from "lucide-react-native";
import auth from "@react-native-firebase/auth";
import firestore, { FirebaseFirestoreTypes } from "@react-native-firebase/firestore";
import COLORS from "@/src/constants/colors";
import { useTranslation } from "react-i18next";
import { BannerAd, BannerAdSize } from "@/src/components/AdBanner";
import { adUnitId } from "@/src/constants/config";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useScrollDirection } from "@/src/hooks/useScrollDirection";
import { useAuthUser } from "@/src/hooks/useAuthUser";
import CustomTextInput from "@/src/components/CustomTextInput";

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
  { id: "rated", name: "Rated", type: "default" },
];

// main
const UserListsScreen = ({ navigation }: Props) => {
  const [lists, setLists] = useState<GameList[]>([]);
  const [newListName, setNewListName] = useState<string>("");
  const [isModalVisible, setModalVisible] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [showAds, setShowAds] = useState<boolean>(false);
  const [isReady, setIsReady] = useState<boolean>(false);
  const { user, isAnonymous } = useAuthUser();
  const { t } = useTranslation();
  const { onScroll } = useScrollDirection();

  // Ad
  useEffect(() => {
    const task = runAfterInteractions(() => {
      setShowAds(true);
      setIsReady(true);
    });
    return () => task.cancel();
  }, []);

  // Header button
  useEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        user && !isAnonymous ? (
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            style={{ padding: 6, marginRight: 6 }}
          >
            <CirclePlus size={28} color="#fff" />
          </TouchableOpacity>
        ) : null,
    });
  }, [navigation, user, isAnonymous]);

  // i18n list name
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

  // Firestore init + listener

  useEffect(() => {
    if (!user || isAnonymous) return;

    const listsRef = firestore().collection("users").doc(user.uid).collection("lists");

    const initDefaults = async (): Promise<void> => {
      try {
        const snap = await listsRef.get();

        const docRated = await listsRef.doc("rated").get();
        if (docRated && !docRated.exists) {
          await listsRef.doc("rated").set({
            name: "Rated",
            type: "default",
            createdAt: firestore.FieldValue.serverTimestamp(),
          });
        }

        if (snap.empty) {
          const batch = firestore().batch();
          DEFAULT_LISTS.forEach(({ id, name, type }) => {
            if (id === "rated") return;
            batch.set(listsRef.doc(id), {
              name,
              type,
              createdAt: firestore.FieldValue.serverTimestamp(),
            });
          });
          await batch.commit();
        } else {
          const allowedDefaultIds = ["played", "wantToPlay", "playing", "rated"];
          for (const doc of snap.docs) {
            const data = doc.data();
            if (data.type === "default" && !allowedDefaultIds.includes(doc.id)) {
              await doc.ref.delete();
            }
          }
        }
      } catch (error) {
        console.error("[UserListsScreen] initDefaults error:", error);
      }
    };

    initDefaults();

    const unsub = listsRef.onSnapshot(
      (snap) => {
        const parsed = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<GameList, "id">),
        }));
        const DEFAULT_ORDER = ["played", "wantToPlay", "playing", "rated"];
        parsed.sort((a, b) => {
          const aIdx = DEFAULT_ORDER.indexOf(a.id);
          const bIdx = DEFAULT_ORDER.indexOf(b.id);
          if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
          if (aIdx !== -1) return -1;
          if (bIdx !== -1) return 1;
          const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return aTime - bTime || a.name.localeCompare(b.name);
        });
        setLists(parsed);
      },
      (error) => {
        console.error("[UserListsScreen] onSnapshot error:", error);
      },
    );

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
        ToastAndroid.LONG,
      );
      return;
    }

    const currentUser = auth().currentUser;
    if (!currentUser) return;

    setIsCreating(true);
    try {
      const ref = firestore()
        .collection("users")
        .doc(currentUser.uid)
        .collection("lists")
        .doc();
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
  }, [newListName, lists, t, isAnonymous]);

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
                .collection("users")
                .doc(user.uid)
                .collection("lists")
                .doc(listId)
                .delete();
            },
          },
        ],
      );
    },
    [user, t],
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
            onPress={() =>
              navigation.navigate("UserGamesScreen", {
                listId: item.id,
                listName: item.name,
              })
            }
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {item.type === "default" ? <List size={24} color={COLORS.lightGray} /> : <FolderOpen size={24} color={COLORS.lightGray} />}
              <CustomText style={styles.listName}>{getDisplayName(item.name)}</CustomText>
            </View>
            {item.type === "custom" && (
              <TouchableOpacity onPress={() => handleDeleteList(item.id, item.name)}>
                <Trash2 size={20} color="red" />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
          {showAd && (
            <View style={styles.ad}>
              <CustomText style={styles.adText}>{t("common.ad")}</CustomText>
              <BannerAd unitId={adUnitId} size={BannerAdSize.MEDIUM_RECTANGLE} />
            </View>
          )}
        </>
      );
    },
    [showAds, lists.length, getDisplayName, handleDeleteList, navigation, t],
  );



  if (isAnonymous || !user) {
    return (
      <SafeAreaView style={styles.container} edges={["right", "left"]}>
        <View style={styles.emptyContainer}>
          <CustomText style={styles.emptyText}>
            <TriangleAlert size={182} color={COLORS.lightGray} />
            {"\n"}
            {t("common.loginRequired")}
          </CustomText>
        </View>
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
      <Modal visible={isModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <CustomText style={styles.modalTitle}>
                {t("userLists.actions.createNewList")}
              </CustomText>
              <CustomTextInput
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
                  <CustomText style={styles.textBtn}>{t("common.cancel")}</CustomText>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleCreateList}
                  style={styles.createBtn}
                  disabled={isCreating}
                >
                  <CustomText style={styles.textBtn}>{t("common.create")}</CustomText>
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
  container: { flex: 1, backgroundColor: COLORS.primary },
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
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    margin: "auto",
  },
  emptyText: {
    color: COLORS.textLight,
    fontSize: 16,
    textAlign: "center",
    opacity: 0.8,
    flexDirection: "column",
    alignItems: "center",
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
