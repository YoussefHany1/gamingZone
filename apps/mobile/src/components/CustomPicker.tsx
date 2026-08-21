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
import { Ionicons } from "@expo/vector-icons";
import COLORS from "../constants/colors";
import { SafeAreaView } from "react-native-safe-area-context";
import CustomText from "./CustomText";

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

    const selectedLabel: string = useMemo(
      () => options.find((opt) => opt.value === selectedValue)?.label ?? placeholder,
      [options, selectedValue, placeholder],
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
          <CustomText style={[styles.pickerText, !selectedValue && { color: "#ccc" }]}>
            {selectedLabel}
          </CustomText>
          <Ionicons name="chevron-down" size={20} color="white" />
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
              style={StyleSheet.absoluteFillObject}
              activeOpacity={1}
              onPress={() => setModalVisible(false)}
            />

            {/* Sheet content — lives above the overlay so touches work */}
            <SafeAreaView style={styles.modalContent} edges={["bottom"]}>
              <View style={styles.modalHeader}>
                <CustomText style={styles.modalTitle}>{placeholder}</CustomText>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#7eaafcff" />
                </TouchableOpacity>
              </View>

              {/* ScrollView renders all items without needing a pre-measured height */}
              <ScrollView
                bounces={false}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {options.map((item) => (
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
                      <Ionicons name="checkmark" size={24} color="#7eaafcff" />
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

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  pickerButton: {
    backgroundColor: "rgba(119, 155, 221, 0.2)",
    padding: 15,
    borderRadius: 5,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pickerText: {
    fontSize: 14,
    color: "white",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.primary,
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
    borderBottomColor: COLORS.secondary,
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  optionItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.secondary,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  optionText: {
    fontSize: 16,
    color: "#fff",
  },
  selectedOption: {
    backgroundColor: COLORS.secondary + "33",
    borderRadius: 12,
  },
  selectedOptionText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
