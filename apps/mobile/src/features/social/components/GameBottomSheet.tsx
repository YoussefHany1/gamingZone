import React from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { logModalOpen, useModalLogger } from "@/src/lib/navigationLogger";

type GameBottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  animationType?: "none" | "slide" | "fade";
  name?: string;
  title?: string;
  file?: string;
};

export default function GameBottomSheet({
  visible,
  onClose,
  children,
  animationType = "fade",
  name,
  title,
  file,
}: GameBottomSheetProps) {
  const styles = useThemeStyles((c) => ({
    backdrop: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: c.overlay,
    },
    sheet: {
      maxHeight: "92%",
      padding: 20,
      paddingTop: 10,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      backgroundColor: c.backgroundDeep,
      borderTopWidth: 1,
      borderColor: c.accentBorder,
    },
    handle: {
      alignSelf: "center",
      width: 42,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.accentSurface,
      marginBottom: 14,
    },
    backdropSpacer: { flex: 1 },
  }));

  const modalLabel = name ?? title ?? "GameBottomSheet";
  const modalFile = file ?? "src/features/social/components/GameBottomSheet.tsx";

  useModalLogger(modalLabel, visible, modalFile);

  return (
    <Modal
      visible={visible}
      transparent
      animationType={animationType}
      onRequestClose={onClose}
      onShow={() => logModalOpen({ name: modalLabel, file: modalFile })}
      accessibilityViewIsModal
      accessibilityLabel={modalLabel}
    >
      <View style={styles.backdrop}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdropSpacer} />
        </TouchableWithoutFeedback>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
