import { useEffect, useState, useCallback, memo, useRef } from "react";
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
} from "react-native";
import { ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import firestore from "@react-native-firebase/firestore";
import COLORS from "@/src/constants/colors";
import { useTranslation } from "react-i18next";
import { UserList } from "@/src/types/sharedTypes";
import { useAuthUser } from "@/src/hooks/useAuthUser";
import type { ListSelectionModalProps } from "../../types";

const ListSelectionModal: React.FC<ListSelectionModalProps> = memo(
  ({ visible, onClose, gameId, gameData }) => {
    const [lists, setLists] = useState<UserList[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [isCreating, setIsCreating] = useState<boolean>(false);
    const [newListName, setNewListName] = useState<string>("");
    const [creatingLoading, setCreatingLoading] = useState<boolean>(false);

    // Cache checked state between modal opens — avoids Firestore re-read race conditions
    // The modal stays mounted (only visibility toggles), so refs persist across opens
    const checkedStateRef = useRef<Map<string, boolean>>(new Map());
    const fetchedGameIdRef = useRef<string | number | null>(null);
    const cachedListsRef = useRef<UserList[]>([]);

    const { t } = useTranslation();
    const { user, isAnonymous } = useAuthUser();

    // Map well-known list names to translated labels
    const getDisplayName = useCallback(
      (originalName: string): string => {
        switch (originalName) {
          case "Playing":
            return t("games.details.listStatus.playing");
          case "Played":
            return t("games.details.listStatus.played");
          case "Want to Play":
            return t("games.details.listStatus.wantToPlay");
          case "Rated":
            return t("games.details.listStatus.rated");
          default:
            return originalName;
        }
      },
      [t],
    );

    useEffect(() => {
      if (!visible) {
        setIsCreating(false);
        setNewListName("");
        return;
      }

      let isMounted = true;
      if (!user) return;

      // If we already fetched for this gameId, restore from ref instantly — no Firestore read
      if (
        fetchedGameIdRef.current === String(gameId) &&
        cachedListsRef.current.length > 0
      ) {
        console.log(
          "[ListSelectionModal] Restoring from ref cache for gameId:",
          gameId,
        );
        const restored = cachedListsRef.current.map((l) => ({
          ...l,
          isChecked: checkedStateRef.current.get(l.id) ?? false,
        }));
        setLists(restored);
        setLoading(false);
        return;
      }

      // First open for this gameId — fetch from Firestore
      setLists([]);
      setLoading(true);

      const fetchLists = async () => {
        const listsRef = firestore()
          .collection("users")
          .doc(user.uid)
          .collection("lists");

        try {
          const snapshot = await listsRef.get();
          if (!isMounted) return;

          const initialLists: UserList[] = snapshot.docs
            .filter((doc) => doc.id !== "rated")
            .map((doc) => ({
              id: doc.id,
              name: doc.data().name as string,
              isChecked: false,
            }));

          if (!gameId) {
            if (!isMounted) return;
            cachedListsRef.current = initialLists;
            fetchedGameIdRef.current = String(gameId);
            setLists(initialLists);
            setLoading(false);
            return;
          }

          console.log(
            "[ListSelectionModal] First fetch for gameId:",
            gameId,
            "type:",
            typeof gameId,
          );

          // DEBUG: Log actual document IDs stored in each list's games subcollection
          for (const list of initialLists) {
            const gamesSnap = await listsRef
              .doc(list.id)
              .collection("games")
              .limit(5)
              .get();
            console.log(
              `[ListSelectionModal] Docs in "${list.id}/games":`,
              gamesSnap.docs.map((d) => d.id),
            );
          }

          const checkedLists = await Promise.all(
            initialLists.map(async (list) => {
              try {
                const snap = await listsRef
                  .doc(list.id)
                  .collection("games")
                  .where(firestore.FieldPath.documentId(), "==", String(gameId))
                  .limit(1)
                  .get();
                const exists = !snap.empty;
                console.log(
                  `[ListSelectionModal] List "${list.id}" -> exists: ${exists}`,
                );
                return { ...list, isChecked: exists };
              } catch (err) {
                console.error(
                  `[ListSelectionModal] Error checking list "${list.id}":`,
                  err,
                );
                return { ...list, isChecked: false };
              }
            }),
          );

          if (!isMounted) return;

          // Store in refs so subsequent opens don't need Firestore
          cachedListsRef.current = checkedLists;
          fetchedGameIdRef.current = String(gameId);
          checkedStateRef.current = new Map(
            checkedLists.map((l) => [l.id, l.isChecked]),
          );

          setLists(checkedLists);
          setLoading(false);
        } catch (error) {
          console.error("[ListSelectionModal] Error fetching lists:", error);
          if (isMounted) setLoading(false);
        }
      };

      fetchLists();

      return () => {
        isMounted = false;
      };
    }, [visible, gameId]);

    const toggleList = useCallback(
      async (listId: string): Promise<void> => {
        if (!user) return;

        const targetListIndex = lists.findIndex((l) => l.id === listId);
        if (targetListIndex === -1) return;

        const currentStatus = lists[targetListIndex]?.isChecked ?? false;
        const newStatus = !currentStatus;

        // Optimistic UI update + update ref so reopen shows correct state
        const updatedLists = lists.map((l, i) =>
          i === targetListIndex ? { ...l, isChecked: newStatus } : l,
        );
        setLists(updatedLists);
        checkedStateRef.current.set(listId, newStatus);
        cachedListsRef.current = updatedLists;

        const gameRef = firestore()
          .collection("users")
          .doc(user.uid)
          .collection("lists")
          .doc(listId)
          .collection("games")
          .doc(String(gameId));

        try {
          if (newStatus) {
            await gameRef.set(
              gameData ?? {
                gameId: String(gameId),
                addedAt: firestore.FieldValue.serverTimestamp(),
              },
            );
          } else {
            await gameRef.delete();
          }
        } catch (error) {
          console.error("Error toggling list:", error);
          // Revert on failure
          const revertLists = lists.map((l, i) =>
            i === targetListIndex ? { ...l, isChecked: currentStatus } : l,
          );
          setLists(revertLists);
          checkedStateRef.current.set(listId, currentStatus);
          cachedListsRef.current = revertLists;
        }
      },
      [lists, gameId, gameData],
    );

    const handleCreateList = useCallback(async (): Promise<void> => {
      if (!user) return;
      if (isAnonymous) {
        ToastAndroid.show(
          t("common.loginRequired") || "Login required",
          ToastAndroid.LONG,
        );
        return;
      }

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
    }, [lists, newListName, t, user, isAnonymous]);

    const renderListItem = useCallback(
      (item: UserList) => (
        <TouchableOpacity
          key={item.id}
          style={[styles.listItem, item.isChecked && styles.selectedOption]}
          onPress={() => toggleList(item.id)}
        >
          <Ionicons
            name={item.isChecked ? "checkbox" : "square-outline"}
            size={24}
            color={COLORS.secondary}
          />
          <Text
            style={[styles.listName, item.isChecked && { fontWeight: "bold" }]}
          >
            {getDisplayName(item.name)}
          </Text>
        </TouchableOpacity>
      ),
      [toggleList, getDisplayName],
    );

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
                  <ScrollView
                    style={{ maxHeight: 300 }}
                    showsVerticalScrollIndicator={true}
                  >
                    {lists.length === 0 ? (
                      <Text
                        style={{
                          color: "#ccc",
                          textAlign: "center",
                          marginVertical: 10,
                        }}
                      >
                        {t("userLists.empty.title")}
                      </Text>
                    ) : (
                      lists.map(renderListItem)
                    )}
                  </ScrollView>

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
                        onPress={() => {
                          if (isAnonymous) {
                            ToastAndroid.show(
                              t("common.loginRequired") || "Login required",
                              ToastAndroid.LONG,
                            );
                          } else {
                            setIsCreating(true);
                          }
                        }}
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
  },
);
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
