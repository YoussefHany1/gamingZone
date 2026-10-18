import type { ComponentType } from "react";
import type { ScrollViewProps } from "react-native";
import { ScrollView as GestureHandlerScrollView } from "react-native-gesture-handler";

/**
 * `react-native-gesture-handler`'s ScrollView, in the shape FlashList's
 * `renderScrollComponent` prop expects.
 *
 * The component is a drop-in replacement for the core ScrollView at runtime, but
 * its props type is not assignable to React Native's `ScrollViewProps`, so a cast
 * is required. Keeping it here means every horizontal FlashList uses the same
 * cast instead of repeating `as any` — or a copy-pasted local constant — at each
 * call site.
 */
export const GestureScrollView: ComponentType<ScrollViewProps> =
  GestureHandlerScrollView as unknown as ComponentType<ScrollViewProps>;
