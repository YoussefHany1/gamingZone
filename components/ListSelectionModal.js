import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import COLORS from "../constants/colors";
import { useTranslation } from "react-i18next";

const ListSelectionModal = ({ visible, onClose, gameId, gameData }) => {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);

  // حالات جديدة خاصة بإنشاء القائمة
  const [isCreating, setIsCreating] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [creatingLoading, setCreatingLoading] = useState(false);

  const { t } = useTranslation();

  const getDisplayName = (originalName) => {
    switch (originalName) {
      case "Playing":
        return t("games.details.listStatus.playing");
      case "Played":
        return t("games.details.listStatus.played");
      case "Want to Play":
        return t("games.details.listStatus.wantToPlay");
      default:
        return originalName;
    }
  };

  useEffect(() => {
    if (!visible) {
      // إعادة تعيين حالة الإنشاء عند إغلاق المودال
      setIsCreating(false);
      setNewListName("");
      return;
    }

    const user = auth().currentUser;
    if (!user) return;

    setLists([]);
    setLoading(true);

    const listsRef = firestore()
      .collection("users")
      .doc(user.uid)
      .collection("lists");

    listsRef.get().then(async (snapshot) => {
      const initialLists = snapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
        isChecked: false,
      }));

      setLists(initialLists);
      setLoading(false);

      if (!gameId) return;

      try {
        const checkedLists = await Promise.all(
          initialLists.map(async (list) => {
            const gameDoc = await listsRef
              .doc(list.id)
              .collection("games")
              .doc(String(gameId))
              .get();
            return {
              ...list,
              isChecked: gameDoc.exists(),
            };
          }),
        );
        setLists(checkedLists);
      } catch (error) {
        console.error("Error checking games:", error);
      }
    });

    return () => {};
  }, [visible, gameId]);

  const toggleList = async (listId) => {
    const user = auth().currentUser;
    if (!user) return;

    const targetListIndex = lists.findIndex((l) => l.id === listId);
    if (targetListIndex === -1) return;

    const currentStatus = lists[targetListIndex].isChecked;
    const newStatus = !currentStatus;

    const updatedLists = [...lists];
    updatedLists[targetListIndex].isChecked = newStatus;
    setLists(updatedLists);

    const gameRef = firestore()
      .collection("users")
      .doc(user.uid)
      .collection("lists")
      .doc(listId)
      .collection("games")
      .doc(String(gameId));

    try {
      if (newStatus) {
        if (gameData) {
          await gameRef.set(gameData);
        }
      } else {
        await gameRef.delete();
      }
    } catch (error) {
      console.error("Error toggling list:", error);
      const revertLists = [...lists];
      revertLists[targetListIndex].isChecked = currentStatus;
      setLists(revertLists);
    }
  };

  // دالة جديدة لإنشاء القائمة
  const handleCreateList = async () => {
    if (!newListName.trim()) return;

    const user = auth().currentUser;
    if (!user) return;

    setCreatingLoading(true);
    try {
      const newListRef = firestore()
        .collection("users")
        .doc(user.uid)
        .collection("lists")
        .doc(); // إنشاء ID تلقائي

      const listData = {
        name: newListName.trim(),
        type: "custom",
        createdAt: firestore.FieldValue.serverTimestamp(),
      };

      await newListRef.set(listData);

      // تحديث الواجهة محلياً بإضافة القائمة الجديدة
      const newList = {
        id: newListRef.id,
        name: listData.name,
        isChecked: false, // تبدأ غير مختارة
      };

      setLists((prev) => [...prev, newList]);

      // إعادة تعيين الحقول
      setNewListName("");
      setIsCreating(false);
    } catch (error) {
      console.error("Error creating list:", error);
      alert(t("userLists.errors.couldNotCreateList"));
    } finally {
      setCreatingLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={styles.modalContent}
          onStartShouldSetResponder={() => true}
        >
          <Text style={styles.modalTitle}>
            {t("games.details.listStatus.add") || "Add to..."}
          </Text>
          {loading ? (
            <ActivityIndicator size="large" color={COLORS.secondary} />
          ) : (
            <>
              <FlatList
                data={lists}
                keyExtractor={(item) => item.id}
                extraData={lists}
                showsVerticalScrollIndicator={true}
                style={{ maxHeight: 300 }} // تحديد ارتفاع للقائمة لمنع تداخلها
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.listItem,
                      item.isChecked && styles.selectedOption,
                    ]}
                    onPress={() => toggleList(item.id)}
                  >
                    <Ionicons
                      name={item.isChecked ? "checkbox" : "square-outline"}
                      size={24}
                      color={COLORS.secondary}
                    />
                    <Text
                      style={[
                        styles.listName,
                        item.isChecked && { fontWeight: "bold" },
                      ]}
                    >
                      {getDisplayName(item.name)}
                    </Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text
                    style={{
                      color: "#ccc",
                      textAlign: "center",
                      marginVertical: 10,
                    }}
                  >
                    {t("userLists.empty.title")}
                  </Text>
                }
              />

              {/* قسم إنشاء قائمة جديدة */}
              <View style={styles.createSection}>
                {isCreating ? (
                  <View style={styles.creationForm}>
                    <TextInput
                      style={styles.input}
                      placeholder={t("userLists.placeholders.newListName")}
                      placeholderTextColor="#aaa"
                      value={newListName}
                      onChangeText={setNewListName}
                      autoFocus={true}
                    />
                    <View style={styles.creationButtons}>
                      <TouchableOpacity
                        style={[
                          styles.smallBtn,
                          { backgroundColor: COLORS.darkBackground },
                        ]}
                        onPress={() => setIsCreating(false)}
                      >
                        <Text style={styles.smallBtnText}>
                          {t("common.cancel")}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.smallBtn,
                          { backgroundColor: COLORS.secondary },
                        ]}
                        onPress={handleCreateList}
                        disabled={creatingLoading}
                      >
                        {creatingLoading ? (
                          <ActivityIndicator size="small" color="white" />
                        ) : (
                          <Text style={styles.smallBtnText}>
                            {t("common.create")}
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setIsCreating(true)}
                  >
                    <Ionicons
                      name="add-circle"
                      size={24}
                      color={COLORS.lightGray}
                    />
                    <Text style={styles.addButtonText}>
                      {t("userLists.actions.createNewList")}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: COLORS.primary,
    width: "85%",
    borderRadius: 12,
    // paddingVertical: 20,
    maxHeight: "80%", // زيادة المساحة لتسع الكيبورد أحياناً
  },
  modalTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
    paddingTop: 20,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.secondary + "40",
  },
  listName: {
    color: "white",
    fontSize: 16,
    marginLeft: 12,
  },
  selectedOption: {
    backgroundColor: COLORS.secondary + "22",
  },
  createSection: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  addButtonText: {
    color: COLORS.lightGray,
    marginLeft: 8,
    fontWeight: "bold",
    fontSize: 16,
  },
  creationForm: {
    width: "100%",
  },
  input: {
    backgroundColor: COLORS.secondary + "40",
    borderRadius: 8,
    color: "white",
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  creationButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  smallBtn: {
    flex: 0.48,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  smallBtnText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
});

export default ListSelectionModal;
