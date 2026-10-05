import { useState, useCallback, useMemo, memo } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ViewStyle,
} from "react-native";
import { Check, ChevronDown, X } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CustomText from "./CustomText";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";

type PickerOption = {
  label: string;
  value: string;
};
type CustomPickerProps = {
  options: PickerOption[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  containerStyle?: ViewStyle;
};

const CustomPicker: React.FC<CustomPickerProps> = memo(
  ({
    options,
    selectedValue,
    onValueChange,
    placeholder = "Select an option",
    containerStyle,
  }) => {
    const [modalVisible, setModalVisible] = useState<boolean>(false);
    const colors = useThemeColors();

    const styles = useThemeStyles((c) => ({
      container: {
        marginBottom: 10,
      },
      pickerButton: {
        backgroundColor: c.surface,
        padding: 15,
        borderRadius: 5,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
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
        filteredOptions.find((opt) => opt.value === selectedValue)?.label ?? placeholder,
      [filteredOptions, selectedValue, placeholder],
    );

    const handleSelect = useCallback(
      (value: string): void => {
        onValueChange(value);
        setModalVisible(false);
      },
      [onValueChange],
    );

    return (
      <View style={[styles.container, containerStyle]}>
        {/* Trigger button */}
        <TouchableOpacity
          style={styles.pickerButton}
          onPress={() => setModalVisible(true)}
        >
          <CustomText
            style={[styles.pickerText, !selectedValue && styles.placeholderText]}
          >
            {selectedLabel}
          </CustomText>
          <ChevronDown size={20} color={colors.text} />
        </TouchableOpacity>

        {/* Options modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            {/* Dimmed background — tap to close */}
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => setModalVisible(false)}
            />

            {/* Sheet content — lives above the overlay so touches work */}
            <SafeAreaView style={styles.modalContent} edges={["bottom"]}>
              <View style={styles.modalHeader}>
                <CustomText style={styles.modalTitle}>{placeholder}</CustomText>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <X size={24} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* ScrollView renders all items without needing a pre-measured height */}
              <ScrollView
                bounces={false}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {filteredOptions.map((item) => (
                  <TouchableOpacity
                    key={item.value}
                    style={[
                      styles.optionItem,
                      item.value === selectedValue && styles.selectedOption,
                    ]}
                    onPress={() => handleSelect(item.value)}
                    activeOpacity={0.7}
                  >
                    <CustomText
                      style={[
                        styles.optionText,
                        item.value === selectedValue && styles.selectedOptionText,
                      ]}
                    >
                      {item.label}
                    </CustomText>
                    {item.value === selectedValue && (
                      <Check size={24} color={colors.accentText} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </SafeAreaView>
          </View>
        </Modal>
      </View>
    );
  },
);

CustomPicker.displayName = "CustomPicker";
export default CustomPicker;
