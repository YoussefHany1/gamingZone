import { useState, useCallback, useMemo, memo } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ViewStyle,
  ListRenderItemInfo,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import COLORS from "../constants/colors";
import { SafeAreaView } from "react-native-safe-area-context";

interface PickerOption {
  label: string;
  value: string;
}
interface CustomPickerProps {
  options: PickerOption[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  containerStyle?: ViewStyle;
}

const CustomPicker: React.FC<CustomPickerProps> = memo(({
  options,
  selectedValue,
  onValueChange,
  placeholder = "Select an option",
  containerStyle,
}) => {
  const [modalVisible, setModalVisible] = useState<boolean>(false);

  // Derive the display label for the currently selected value
  const selectedLabel: string = useMemo(
    () => options.find((opt) => opt.value === selectedValue)?.label ?? placeholder,
    [options, selectedValue, placeholder]
  );

  const handleSelect = useCallback((value: string): void => {
    onValueChange(value);
    setModalVisible(false);
  }, [onValueChange]);

  const renderItem = useCallback(({ item }: ListRenderItemInfo<PickerOption>) => (
    <TouchableOpacity
      style={[
        styles.optionItem,
        item.value === selectedValue && styles.selectedOption,
      ]}
      onPress={() => handleSelect(item.value)}
    >
      <Text
        style={[
          styles.optionText,
          item.value === selectedValue && styles.selectedOptionText,
        ]}
      >
        {item.label}
      </Text>
      {item.value === selectedValue && (
        <Ionicons name="checkmark" size={24} color="#7eaafcff" />
      )}
    </TouchableOpacity>
  ), [selectedValue, handleSelect]);

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Trigger button */}
      <TouchableOpacity
        style={styles.pickerButton}
        onPress={() => setModalVisible(true)}
      >
        <Text
          style={[styles.pickerText, !selectedValue && { color: "#ccc" }]}
        >
          {selectedLabel}
        </Text>
        <Ionicons name="chevron-down" size={20} color="white" />
      </TouchableOpacity>

      {/* Options modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <SafeAreaView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{placeholder}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#7eaafcff" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={options}
              keyExtractor={(item) => item.value.toString()}
              renderItem={renderItem}
            />
          </SafeAreaView>
        </TouchableOpacity>
      </Modal>
    </View>
  );
});
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
    padding: 20,
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