import { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ToastAndroid,
  Modal,
  StyleSheet,
  InteractionManager,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import COLORS from "../constants/colors";
import { useTranslation } from "react-i18next";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
import { adUnitId } from "../constants/config";

export default function UserListsScreen({ navigation }) {
  const [lists, setLists] = useState([]);
  const [newListName, setNewListName] = useState("");
  const [isModalVisible, setModalVisible] = useState(false);
  const [showAds, setShowAds] = useState(false);
  const user = auth().currentUser;
  const { t } = useTranslation();

  // active ads after interactions
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setShowAds(true);
    });
    return () => task.cancel();
  }, []);

  const getDisplayName = (originalName) => {
    switch (originalName) {
      case "Playing":
        return t("games.details.listStatus.playing");
      case "Played":
        return t("games.details.listStatus.played");
      case "Want to Play":
        return t("games.details.listStatus.wantToPlay");
      default:
        return originalName; // if it's a custom list return the original name
    }
  };

  useEffect(() => {
    if (!user) return;

    // 1. Create default lists if they don't exist
    const initDefaults = async () => {
      const listsRef = firestore()
        .collection("users")
        .doc(user.uid)
        .collection("lists");
      const snapshot = await listsRef.get();

      if (snapshot.empty) {
        const batch = firestore().batch();
        const defaultLists = [
          { id: "played", name: "Played", type: "default" },
          { id: "wantToPlay", name: "Want to Play", type: "default" },
          { id: "playing", name: "Playing", type: "default" },
        ];

        defaultLists.forEach((list) => {
          const docRef = listsRef.doc(list.id);
          batch.set(docRef, {
            name: list.name,
            type: list.type,
            createdAt: firestore.FieldValue.serverTimestamp(),
          });
        });
        await batch.commit();
      }
    };

    initDefaults();

    // Fetch lists
    const unsubscribe = firestore()
      .collection("users")
      .doc(user.uid)
      .collection("lists")
      .orderBy("createdAt", "asc")
      .onSnapshot((snapshot) => {
        const loadedLists = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setLists(loadedLists);
      });

    return () => unsubscribe();
  }, [user]);

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    try {
      await firestore()
        .collection("users")
        .doc(user.uid)
        .collection("lists")
        .add({
          name: newListName,
          type: "custom",
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
      setNewListName("");
      setModalVisible(false);
    } catch (error) {
      ToastAndroid.show(
        t("userLists.errors.couldNotCreateList"),
        ToastAndroid.LONG,
      );
    }
  };

  const handleDeleteList = (listId, listName) => {
    Alert.alert(
      t("userLists.actions.confirmDeleteTitle"),
      `Delete "${listName}"?`,
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.remove"),
          style: "destructive",
          onPress: async () => {
            // Delete the list
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
  };

  return (
    <SafeAreaView style={styles.container} edges={["right", "left", "top"]}>
      <FlatList
        data={lists}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
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
                <Ionicons
                  name={
                    item.type === "default" ? "list" : "folder-open-outline"
                  }
                  size={24}
                  color={COLORS.lightGray}
                />
                <Text style={styles.listName}>{getDisplayName(item.name)}</Text>
              </View>
              {item.type === "custom" && (
                <TouchableOpacity
                  onPress={() => handleDeleteList(item.id, item.name)}
                >
                  <Ionicons name="trash-outline" size={20} color="red" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
            {showAds && // 1. نتحقق أولاً أن الإعلانات مفعلة بشكل عام
              ((index + 1) % 4 === 0 || // 2. إما يظهر كل 4 عناصر
                (lists.length < 4 && index === lists.length - 1)) && (
                <View style={styles.ad}>
                  <Text style={styles.adText}>{t("common.ad")}</Text>
                  <BannerAd
                    unitId={adUnitId}
                    size={BannerAdSize.MEDIUM_RECTANGLE}
                  />
                </View>
              )}
          </>
        )}
        ListFooterComponent={
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            style={styles.addListBtn}
          >
            <Text style={styles.addListText}>
              {t("userLists.actions.createNewList")}
            </Text>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        }
      />

      <Modal visible={isModalVisible} transparent animationType="slide">
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
              >
                <Text style={styles.textBtn}>{t("common.create")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

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
    margin: 16,
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
    fontWeight: "semi-bold",
  },
  textBtn: {
    color: COLORS.textLight,
    fontWeight: "bold",
    fontSize: 16,
  },
});
