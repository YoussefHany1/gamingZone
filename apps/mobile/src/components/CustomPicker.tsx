import { useState, useCallback, useMemo, memo } from "react";
import type { ViewStyle } from "react-native";
import { View, Modal, Pressable, StyleSheet, FlatList } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { Check, ChevronDown, X } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CustomText from "./CustomText";
import { useTranslation } from "react-i18next";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import type { PickerOption } from "@/src/types/sharedTypes";

type CustomPickerProps = {
  options: PickerOption[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  containerStyle?: ViewStyle;
  icon?: LucideIcon;
};

const CustomPicker: React.FC<CustomPickerProps> = memo(
  ({
    options,
    selectedValue,
    onValueChange,
    placeholder,
    containerStyle,
    icon: Icon,
  }) => {
    const [modalVisible, setModalVisible] = useState<boolean>(false);
    const { t } = useTranslation();
    const colors = useThemeColors();
    // Default stays out of the destructuring: it needs the active language.
    const resolvedPlaceholder = placeholder ?? t("common.selectAnOption");

    const styles = useThemeStyles((c) => ({
      container: {},
      pickerButton: {
        backgroundColor: c.surface,
        padding: 15,
        borderRadius: 12,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderWidth: 1,
        borderColor: c.accentBorder,
      },
      leftContent: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
      },
      icon: {
        marginEnd: 10,
      },
      pickerText: {
        fontSize: 14,
        color: c.text,
      },
      placeholderText: {
        color: c.textSubtle,
      },
      modalOverlay: {
        flex: 1,
        backgroundColor: c.overlay,
        justifyContent: "flex-end",
      },
      modalContent: {
        backgroundColor: c.background,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 20,
        paddingTop: 20,
        maxHeight: "50%",
      },
      modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: c.border,
        paddingBottom: 10,
      },
      modalTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: c.text,
      },
      optionItem: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: c.border,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
      },
      optionText: {
        fontSize: 16,
        color: c.text,
      },
      selectedOption: {
        backgroundColor: c.accentSurface,
        borderRadius: 12,
      },
      selectedOptionText: {
        color: c.accentText,
        fontWeight: "bold",
      },
    }));

    const filteredOptions = useMemo(
      () => options.filter((opt) => opt.value !== "" && opt.label !== ""),
      [options],
    );

    const selectedLabel: string = useMemo(
      () =>
        filteredOptions.find((opt) => opt.value === selectedValue)?.label ??
        resolvedPlaceholder,
      [filteredOptions, selectedValue, resolvedPlaceholder],
    );

    const handleSelect = useCallback(
      (value: string): void => {
        onValueChange(value);
        setModalVisible(false);
      },
      [onValueChange],
    );

    const renderOption = useCallback(
      ({ item }: { item: PickerOption }): React.ReactElement => {
        const selected = item.value === selectedValue;
        return (
          <Pressable
            style={({ pressed }) => [
              styles.optionItem,
              selected && styles.selectedOption,
              pressed && { opacity: 0.85 },
            ]}
            android_ripple={{ color: "rgba(128,128,128,0.25)", borderless: false }}
            onPress={() => handleSelect(item.value)}
            accessibilityRole="radio"
            accessibilityState={selected ? { selected: true } : undefined}
          >
            <CustomText
              style={[styles.optionText, selected && styles.selectedOptionText]}
            >
              {item.label}
            </CustomText>
            {selected && <Check size={24} color={colors.accentText} />}
          </Pressable>
        );
      },
      [selectedValue, handleSelect, styles, colors.accentText],
    );

    return (
      <View style={[styles.container, containerStyle]}>
        {/* Trigger button */}
        <Pressable
          style={({ pressed }) => [styles.pickerButton, pressed && { opacity: 0.85 }]}
          android_ripple={{ color: "rgba(128,128,128,0.25)", borderless: false }}
          onPress={() => setModalVisible(true)}
          accessibilityRole="button"
        >
          <View style={styles.leftContent}>
            {Icon ? (
              <Icon
                size={20}
                color={selectedValue ? colors.accentText : colors.textSubtle}
                style={styles.icon}
              />
            ) : null}
            <CustomText
              style={[styles.pickerText, !selectedValue && styles.placeholderText]}
            >
              {selectedLabel}
            </CustomText>
          </View>
          <ChevronDown size={20} color={colors.text} />
        </Pressable>

        {/* Options modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            {/* Dimmed background — tap to close. No ripple/press dim: the
                original activeOpacity={1} deliberately had zero feedback. */}
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setModalVisible(false)}
            />

            {/* Sheet content — lives above the overlay so touches work */}
            <SafeAreaView style={styles.modalContent} edges={["bottom"]}>
              <View style={styles.modalHeader}>
                <CustomText style={styles.modalTitle}>{resolvedPlaceholder}</CustomText>
                <Pressable
                  style={({ pressed }) => pressed && { opacity: 0.85 }}
                  android_ripple={{
                    color: "rgba(128,128,128,0.25)",
                    borderless: true,
                    radius: 20,
                  }}
                  onPress={() => setModalVisible(false)}
                  accessibilityRole="button"
                  accessibilityLabel={t("common.close")}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={24} color={colors.accentText} />
                </Pressable>
              </View>

              {/* Virtualized: large option sets (e.g. ~250 countries) no longer
                  mount every row when the sheet opens. */}
              <FlatList
                data={filteredOptions}
                keyExtractor={(item) => item.value}
                renderItem={renderOption}
                initialNumToRender={16}
                maxToRenderPerBatch={24}
                windowSize={9}
                bounces={false}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              />
            </SafeAreaView>
          </View>
        </Modal>
      </View>
    );
  },
);

CustomPicker.displayName = "CustomPicker";
export default CustomPicker;
