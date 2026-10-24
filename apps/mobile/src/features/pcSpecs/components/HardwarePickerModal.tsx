import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { Check, Search, X } from "lucide-react-native";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import CustomText from "@/src/components/CustomText";
import { PC_CPUS, PC_GPUS, searchHardware } from "@gaming-zone/utils";
import type { PcCpu, PcGpu } from "@gaming-zone/core";

type PickerKind = "cpu" | "gpu";

type HardwarePickerModalProps = {
  visible: boolean;
  kind: PickerKind;
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
};

type PickerRow = PcCpu | PcGpu;

/**
 * Bottom-sheet hardware picker with search. Replaces the old inline
 * conditional full-screen render: it has a header, a result count, VRAM
 * subtitles, a selected checkmark and an empty state.
 *
 * The sheet is keyboard-aware: on iOS the search field rides above the
 * keyboard (`padding`), on Android the window resizes (`height`), and taps on
 * results register while the keyboard is up.
 */
const HardwarePickerModal: React.FC<HardwarePickerModalProps> = ({
  visible,
  kind,
  selectedId,
  onSelect,
  onClose,
}) => {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (visible) setQuery("");
  }, [visible, kind]);

  const catalog = kind === "cpu" ? PC_CPUS : PC_GPUS;
  const results = useMemo(() => searchHardware(catalog, query), [catalog, query]);

  const styles = useThemeStyles((c) => ({
    kbView: { flex: 1, justifyContent: "flex-end" as const },
    backdrop: { flex: 1, backgroundColor: c.overlay },
    sheet: {
      backgroundColor: c.backgroundDeep,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: "85%",
      paddingBottom: 16,
    },
    handle: {
      alignSelf: "center",
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.accent,
      marginTop: 12,
      marginBottom: 8,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingBottom: 12,
    },
    title: { color: c.text, fontSize: 18, fontWeight: "700", flex: 1 },
    count: { color: c.textMuted, fontSize: 13, marginRight: 8 },
    searchRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginHorizontal: 20,
      marginBottom: 10,
      paddingHorizontal: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.background,
    },
    searchInput: { flex: 1, paddingVertical: 10, color: c.text, fontSize: 15 },
    list: { paddingHorizontal: 20, gap: 6 },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.background,
    },
    rowActive: { borderColor: c.accentBorder, backgroundColor: c.accentSurface },
    rowText: { color: c.text, flex: 1, fontWeight: "500" },
    rowSub: { color: c.textMuted, fontSize: 12 },
    rowTextWrap: { flex: 1, gap: 2 },
    empty: {
      alignItems: "center",
      paddingVertical: 32,
      paddingHorizontal: 20,
      gap: 6,
    },
    emptyText: { color: c.textMuted, textAlign: "center" },
    closeBtn: { padding: 4 },
  }));

  const renderRow = ({ item }: { item: PickerRow }) => {
    const selected = item.id === selectedId;
    const vram = (item as PcGpu).vramGb;
    return (
      <TouchableOpacity
        style={[styles.row, selected && styles.rowActive]}
        onPress={() => {
          onSelect(item.id);
          onClose();
        }}
        accessibilityRole="button"
        accessibilityState={{ selected }}
      >
        <View style={styles.rowTextWrap}>
          <CustomText style={styles.rowText} numberOfLines={1}>
            {item.label}
          </CustomText>
          {kind === "gpu" && vram !== undefined && (
            <CustomText style={styles.rowSub}>
              {t("pcSpecs.picker.vram", { vram })}
            </CustomText>
          )}
        </View>
        {selected && <Check size={18} color={colors.accentText} />}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.kbView}
        behavior={Platform.OS === "android" ? "height" : "padding"}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <CustomText style={styles.title}>
              {kind === "cpu" ? t("pcSpecs.picker.titleCpu") : t("pcSpecs.picker.titleGpu")}
            </CustomText>
            <CustomText style={styles.count}>
              {t("pcSpecs.picker.resultsCount", { count: results.length })}
            </CustomText>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel={t("common.close")}
            >
              <X size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchRow}>
            <Search size={18} color={colors.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t("pcSpecs.picker.searchPlaceholder")}
              placeholderTextColor={colors.textMuted}
              style={styles.searchInput}
              autoCorrect={false}
              autoCapitalize="none"
              autoFocus
            />
          </View>

          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            renderItem={renderRow}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.empty}>
                <CustomText style={styles.emptyText}>
                  {t("pcSpecs.picker.noResults")}
                </CustomText>
              </View>
            }
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default HardwarePickerModal;
