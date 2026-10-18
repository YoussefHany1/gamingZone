import React, { memo, useCallback } from "react";
import { View, TouchableOpacity } from "react-native";
import { Check } from "lucide-react-native";
import CustomText from "@/src/components/CustomText";
import { geometry } from "./geometry";
import type { AppearanceTileProps } from "./types";

/**
 * One appearance option, painted entirely in the palette it offers so a look
 * can be judged before it is selected.
 */
const AppearanceTile = memo(
  ({
    id,
    label,
    palette,
    isSelected,
    ringColor,
    ringTransparent,
    labelColor,
    onPress,
  }: AppearanceTileProps): React.ReactElement => {
    const handlePress = useCallback((): void => onPress(id), [id, onPress]);

    return (
      <View style={geometry.tileWrapper}>
        <TouchableOpacity
          style={[
            geometry.tileTouchable,
            { borderColor: isSelected ? ringColor : ringTransparent },
          ]}
          onPress={handlePress}
          activeOpacity={0.75}
          accessibilityRole="radio"
          accessibilityState={{ selected: isSelected }}
          accessibilityLabel={label}
        >
          {/* Main swatch: background fill */}
          <View style={[geometry.tileSwatch, { backgroundColor: palette.background }]}>
            {/* Surface stripe at the bottom */}
            <View style={[geometry.tileStripe, { backgroundColor: palette.surface }]} />
            {/* Accent dot at top-right */}
            <View style={[geometry.tileDot, { backgroundColor: palette.accent }]} />
            {/* Check mark when selected */}
            {isSelected && (
              <View style={[geometry.tileCheck, { backgroundColor: palette.accent }]}>
                <Check size={10} color={palette.onAccent} strokeWidth={3} />
              </View>
            )}
          </View>
        </TouchableOpacity>
        <CustomText style={[geometry.tileLabel, { color: labelColor }]} numberOfLines={2}>
          {label}
        </CustomText>
      </View>
    );
  },
);

AppearanceTile.displayName = "AppearanceTile";
export default AppearanceTile;
