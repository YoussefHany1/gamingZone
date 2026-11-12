import React from "react";
import { StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import CustomText from "@/src/components/CustomText";
import PressScale from "@/src/components/PressScale";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

const AnimatedPressScale = Animated.createAnimatedComponent(PressScale as any);

const SelectablePill: React.FC<Props> = ({ label, selected, onPress }) => {
  const styles = useThemeStyles(
    (c) => ({
      pill: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: selected ? c.accent : c.border,
        backgroundColor: selected ? c.accentSurface : c.surface,
        margin: 6,
      },
      label: {
        fontSize: 14,
        fontWeight: "600",
        color: selected ? c.accentText : c.text,
      },
    }),
    [selected],
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(selected ? 1.03 : 1, { damping: 14 }) }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <PressScale onPress={onPress} style={styles.pill} accessibilityRole="button">
        <CustomText style={styles.label}>{label}</CustomText>
      </PressScale>
    </Animated.View>
  );
};

export default React.memo(SelectablePill);
