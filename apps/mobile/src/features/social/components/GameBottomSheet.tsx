import React from "react";
import { KeyboardAvoidingView, Modal, Platform, TouchableWithoutFeedback, View } from "react-native";
import Animated, { SlideInDown, SlideOutDown } from "react-native-reanimated";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";

type GameBottomSheetProps = { visible: boolean; onClose: () => void; children: React.ReactNode };

export default function GameBottomSheet({ visible, onClose, children }: GameBottomSheetProps) {
  const styles = useThemeStyles((c) => ({
    backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: c.overlay },
    sheet: { maxHeight: "92%", padding: 20, paddingTop: 10, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: c.backgroundDeep, borderTopWidth: 1, borderColor: c.accentBorder },
    handle: { alignSelf: "center", width: 42, height: 4, borderRadius: 2, backgroundColor: c.accentSurface, marginBottom: 14 },
    backdropSpacer: { flex: 1 },
  }));
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} accessibilityViewIsModal>
      <View style={styles.backdrop}>
        <TouchableWithoutFeedback onPress={onClose}><View style={styles.backdropSpacer} /></TouchableWithoutFeedback>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Animated.View entering={SlideInDown.springify().damping(18)} exiting={SlideOutDown.duration(180)} style={styles.sheet}>
            <View style={styles.handle} />
            {children}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
