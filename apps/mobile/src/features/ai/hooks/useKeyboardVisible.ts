import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

/**
 * Tracks software-keyboard visibility via the platform-specific keyboard events.
 * Used to collapse the bottom safe-area padding while the keyboard is open.
 */
export function useKeyboardVisible(): boolean {
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return keyboardVisible;
}
