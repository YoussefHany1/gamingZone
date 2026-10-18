import React from "react";
import { View, TouchableOpacity } from "react-native";
import { Pencil } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import CustomTextInput from "@/src/components/CustomTextInput";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import ViewModeToggle from "./ViewModeToggle";
import type { GamesListHeaderProps } from "../../types";

/**
 * The games-list header: a title/description card that the owner can edit
 * in place, a read-only banner for shared lists, and the list/grid view toggle.
 */
const GamesListHeader = ({
  title,
  description,
  canEdit,
  isEditing,
  draftTitle,
  draftDescription,
  isSaving,
  isSharedList,
  showViewToggle,
  viewMode,
  onChangeDraftTitle,
  onChangeDraftDescription,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onChangeView,
}: GamesListHeaderProps) => {
  const { t } = useTranslation();
  const colors = useThemeColors();

  const styles = useThemeStyles((c) => ({
    listHeader: {
      marginTop: 16,
    },
    viewToolbar: {
      flexDirection: "row",
      justifyContent: "flex-end",
      alignItems: "center",
      marginTop: 12,
    },
    headerCard: {
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 16,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    headerTitle: {
      color: c.text,
      fontSize: 22,
      fontWeight: "bold",
    },
    headerDescription: {
      color: c.textSubtle,
      fontSize: 14,
      marginTop: 6,
      lineHeight: 20,
    },
    fieldLabel: {
      color: c.textSubtle,
      fontSize: 13,
      fontWeight: "600",
      marginBottom: 6,
      marginTop: 8,
    },
    headerInput: {
      backgroundColor: c.background,
      padding: 10,
      borderRadius: 8,
      color: c.text,
    },
    headerInputMultiline: {
      minHeight: 80,
      textAlignVertical: "top",
    },
    editActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      alignItems: "center",
      gap: 12,
      marginTop: 16,
    },
    cancelBtn: {
      paddingVertical: 10,
      paddingHorizontal: 16,
    },
    cancelBtnText: {
      color: c.text,
      fontWeight: "bold",
      fontSize: 16,
    },
    saveBtn: {
      backgroundColor: c.accent,
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 8,
    },
    saveBtnDisabled: {
      opacity: 0.6,
    },
    saveBtnText: {
      color: c.onAccent,
      fontWeight: "bold",
      fontSize: 16,
    },
    viewOnlyBanner: {
      marginTop: 16,
      backgroundColor: "rgba(255, 196, 87, 0.15)",
      borderColor: "rgba(255, 196, 87, 0.45)",
      borderWidth: 1,
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    viewOnlyText: {
      // Warm amber banner: a semantic "read-only" warning color, fixed so the
      // translucent banner + border above stay in sync with it.
      color: "#ffc457",
      fontSize: 13,
      textAlign: "center",
      fontWeight: "600",
    },
  }));

  return (
    <View style={styles.listHeader}>
      <View style={styles.headerCard}>
        {isEditing ? (
          <>
            <CustomText style={styles.fieldLabel}>
              {t("userLists.list.titleLabel")}
            </CustomText>
            <CustomTextInput
              style={styles.headerInput}
              value={draftTitle}
              onChangeText={onChangeDraftTitle}
              placeholder={t("userLists.list.titlePlaceholder")}
              placeholderTextColor={colors.textSubtle}
              maxLength={60}
              editable={!isSaving}
            />
            <CustomText style={styles.fieldLabel}>
              {t("userLists.list.descriptionLabel")}
            </CustomText>
            <CustomTextInput
              style={[styles.headerInput, styles.headerInputMultiline]}
              value={draftDescription}
              onChangeText={onChangeDraftDescription}
              placeholder={t("userLists.list.descriptionPlaceholder")}
              placeholderTextColor={colors.textSubtle}
              multiline
              maxLength={300}
              editable={!isSaving}
            />
            <View style={styles.editActions}>
              <TouchableOpacity
                onPress={onCancelEdit}
                style={styles.cancelBtn}
                disabled={isSaving}
              >
                <CustomText style={styles.cancelBtnText}>
                  {t("common.cancel")}
                </CustomText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onSaveEdit}
                style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
                disabled={isSaving}
              >
                <CustomText style={styles.saveBtnText}>
                  {t("common.saveChanges")}
                </CustomText>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <TouchableOpacity
            style={styles.headerRow}
            activeOpacity={canEdit ? 0.7 : 1}
            disabled={!canEdit}
            onPress={onStartEdit}
          >
            <View style={{ flex: 1 }}>
              <CustomText style={styles.headerTitle}>{title}</CustomText>
              {description ? (
                <CustomText style={styles.headerDescription}>
                  {description}
                </CustomText>
              ) : null}
            </View>
            {canEdit && <Pencil size={20} color={colors.accent} />}
          </TouchableOpacity>
        )}
      </View>
      {isSharedList ? (
        <View style={styles.viewOnlyBanner}>
          <CustomText style={styles.viewOnlyText}>
            {t("settings.userGames.viewOnly")}
          </CustomText>
        </View>
      ) : null}
      {showViewToggle ? (
        <View style={styles.viewToolbar}>
          <ViewModeToggle value={viewMode} onChange={onChangeView} />
        </View>
      ) : null}
    </View>
  );
};
GamesListHeader.displayName = "GamesListHeader";

export default GamesListHeader;
