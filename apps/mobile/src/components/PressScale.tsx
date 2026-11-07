import React, { useCallback } from "react";
import { Pressable, type PressableProps } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type PressScaleProps = Omit<PressableProps, "style"> & {
  children: React.ReactNode;
  style?: PressableProps["style"];
};

/** Pressable that subtly scales down while pressed (spring, 0.97). */
export default function PressScale({ children, style, ...props }: PressScaleProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const setPressed = useCallback((pressed: boolean) => {
    scale.value = withSpring(pressed ? 0.97 : 1, {
      damping: 18,
      stiffness: 280,
      mass: 0.7,
    });
  }, [scale]);

  return (
    <AnimatedPressable
      {...props}
      onPressIn={(event) => {
        setPressed(true);
        props.onPressIn?.(event);
      }}
      onPressOut={(event) => {
        setPressed(false);
        props.onPressOut?.(event);
      }}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}
