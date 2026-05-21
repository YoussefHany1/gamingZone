import { useEffect, useState, useCallback, memo } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ToastAndroid,
  ListRenderItemInfo,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Ionicons } from "@expo/vector-icons";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import COLORS from "../constants/colors";
import { useTranslation } from "react-i18next";
import { UserList } from "./types";

interface ListSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  gameId?: string | number;
  gameData?: Record<string, unknown>;
}

const ListSelectionModal: React.FC<ListSelectionModalProps> = memo(({
  visible,
  onClose,
  gameId,
  gameData,
}) => {
  const [lists, setLists] = useState<UserList[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [newListName, setNewListName] = useState<string>("");
  const [creatingLoading, setCreatingLoading] = useState<boolean>(false);

  const { t } = useTranslation();

  // Map well-known list names to translated labels
  const getDisplayName = useCallback((originalName: string): string => {
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
  }, [t]);

  useEffect(() => {
    if (!visible) {
      // Reset creation state when modal closes
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
      const initialLists: UserList[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name as string,
        isChecked: false,
      }));

      setLists(initialLists);
      setLoading(false);

      if (!gameId) return;

      try {
        // Check which lists already contain the current game
        const checkedLists = await Promise.all(
          initialLists.map(async (list) => {
            const gameDoc = await listsRef
              .doc(list.id)
              .collection("games")
              .doc(String(gameId))
              .get();
            return { ...list, isChecked: gameDoc.exists() };
          }),
        );
        setLists(checkedLists);
      } catch (error) {
        console.error("Error checking games:", error);
      }
    });
  }, [visible, gameId]);

  const toggleList = useCallback(async (listId: string): Promise<void> => {
    const user = auth().currentUser;
    if (!user) return;

    const targetListIndex = lists.findIndex((l) => l.id === listId);
    if (targetListIndex === -1) return;

    const currentStatus = lists[targetListIndex].isChecked;
    const newStatus = !currentStatus;

    // Optimistic UI update
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
        if (gameData) await gameRef.set(gameData);
      } else {
        await gameRef.delete();
      }
    } catch (error) {
      console.error("Error toggling list:", error);
      // Revert on failure
      const revertLists = [...lists];
      revertLists[targetListIndex].isChecked = currentStatus;
      setLists(revertLists);
    }
  }, [lists, gameId, gameData]);

  const handleCreateList = useCallback(async (): Promise<void> => {
    const trimmedName = newListName.trim();
    if (!trimmedName) return;

    // Prevent duplicates (case-insensitive check)
    const listExists = lists.some(
      (list) => list.name.toLowerCase() === trimmedName.toLowerCase(),
    );

    if (listExists) {
      ToastAndroid.show(
        t("userLists.errors.listAlreadyExists") ||
        "A list with this name already exists",
        ToastAndroid.LONG,
      );
      return;
    }

    const user = auth().currentUser;
    if (!user) return;

    setCreatingLoading(true);
    try {
      const newListRef = firestore()
        .collection("users")
        .doc(user.uid)
        .collection("lists")
        .doc();

      const listData = {
        name: trimmedName,
        type: "custom",
        createdAt: firestore.FieldValue.serverTimestamp(),
      };

      await newListRef.set(listData);

      const newList: UserList = {
        id: newListRef.id,
        name: listData.name,
        isChecked: false,
      };

      setLists((prev) => [...prev, newList]);
      setNewListName("");
      setIsCreating(false);
    } catch (error) {
      console.error("Error creating list:", error);
      ToastAndroid.show(
        t("userLists.errors.couldNotCreateList"),
        ToastAndroid.LONG,
      );
    } finally {
      setCreatingLoading(false);
    }
  }, [lists, newListName, t]);

  const renderItem = useCallback(({ item }: ListRenderItemInfo<UserList>) => (
    <TouchableOpacity
      style={[styles.listItem, item.isChecked && styles.selectedOption]}
      onPress={() => toggleList(item.id)}
    >
      <Ionicons
        name={item.isChecked ? "checkbox" : "square-outline"}
        size={24}
        color={COLORS.secondary}
      />
      <Text style={[styles.listName, item.isChecked && { fontWeight: "bold" }]}>
        {getDisplayName(item.name)}
      </Text>
    </TouchableOpacity>
  ), [toggleList, getDisplayName]);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
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
                <FlashList
                  data={lists}
                  keyExtractor={(item) => item.id}
                  extraData={lists}
                  showsVerticalScrollIndicator={true}
                  style={{ maxHeight: 300 }}
                  renderItem={renderItem}
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
                  estimatedItemSize={50}
                />

                {/* Create new list section */}
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
      </KeyboardAvoidingView>
    </Modal>
  );
});
ListSelectionModal.displayName = "ListSelectionModal";
export default ListSelectionModal;

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
    maxHeight: "80%",
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