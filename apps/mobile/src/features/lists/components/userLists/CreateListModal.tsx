import React from "react";
import {
  View,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import CustomTextInput from "@/src/components/CustomTextInput";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import type { CreateListModalProps } from "../../types";

/**
 * Modal for creating a custom list (name + optional description). Presentational
 * — the parent owns the draft values and performs the write.
 */
const CreateListModal = ({
  visible,
  name,
  description,
  isCreating,
  onChangeName,
  onChangeDescription,
  onCancel,
  onSubmit,
}: CreateListModalProps) => {
  const { t } = useTranslation();
  const colors = useThemeColors();

  const styles = useThemeStyles((c) => ({
    modalContainer: {
      flex: 1,
      justifyContent: "center",
      backgroundColor: c.overlay,
    },
    modalContent: {
      backgroundColor: c.background,
      margin: 20,
      padding: 20,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.accentBorder,
    },
    modalTitle: {
      color: c.text,
      textAlign: "center",
      fontSize: 20,
      fontWeight: "bold",
      marginBottom: 15,
    },
    input: {
      backgroundColor: c.surface,
      padding: 10,
      borderRadius: 8,
      marginBottom: 20,
      color: c.text,
    },
    descriptionInput: {
      minHeight: 80,
      textAlignVertical: "top",
    },
    modalButtons: { flexDirection: "row", justifyContent: "space-around" },
    cancelBtn: { padding: 10, fontWeight: "bold" },
    createBtn: {
      backgroundColor: c.accent,
      padding: 10,
      borderRadius: 8,
      paddingHorizontal: 20,
      fontWeight: "semibold",
    },
    textBtn: {
      color: c.onAccent,
      fontWeight: "bold",
      fontSize: 16,
    },
  }));

  return (
    <Modal visible={visible} transparent animationType="slide">
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
              value={name}
              onChangeText={onChangeName}
              placeholder={t("userLists.placeholders.newListName")}
              placeholderTextColor={colors.textSubtle}
              maxLength={60}
            />
            <CustomTextInput
              style={[styles.input, styles.descriptionInput]}
              value={description}
              onChangeText={onChangeDescription}
              placeholder={t("userLists.placeholders.newListDescription")}
              placeholderTextColor={colors.textSubtle}
              multiline
              maxLength={300}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
                <CustomText style={styles.textBtn}>{t("common.cancel")}</CustomText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onSubmit}
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
  );
};
CreateListModal.displayName = "CreateListModal";

export default CreateListModal;
