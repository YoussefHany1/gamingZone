import React, {
  memo,
  forwardRef,
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  View,
  type TextInput,
  type TextInputProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import CustomTextInput from "@/src/components/CustomTextInput";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from "react-native-reanimated";
import type { LucideIcon } from "lucide-react-native";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import AuthFieldError from "./AuthFieldError";

export type AuthInputProps = Omit<TextInputProps, "style"> & {
  /** Leading lucide icon identifying the field at a glance. */
  icon?: LucideIcon;
  /** Inline validation message shown beneath the field. */
  error?: string | null;
  /** Optional trailing element (e.g. the password show/hide toggle). */
  rightSlot?: React.ReactNode;
  /** Text style applied to the inner `CustomTextInput`. */
  style?: StyleProp<TextStyle>;
  /** Extra layout style (margins etc.) applied to the outer column. */
  containerStyle?: StyleProp<ViewStyle>;
};

/**
 * Shared auth input shell: 12px radius, 1px accent border, an animated focus
 * border that glows in the accent colour (Android elevation), a leading icon
 * slot, and an inline error that turns the border red.
 *
 * Border colour progress: 0 → resting (`accentBorder`), 0.5 → focused
 * (`accent`), 1 → error (`danger`). Error always wins over focus.
 */
const AuthInput = memo(
  forwardRef<TextInput, AuthInputProps>(function AuthInput(
    {
      icon: Icon,
      error,
      rightSlot,
      style,
      containerStyle,
      onFocus,
      onBlur,
      accessibilityRole,
      importantForAutofill = "yes",
      ...props
    },
    ref,
  ) {
    const colors = useThemeColors();
    const [focused, setFocused] = useState(false);

    // Border progress: focus animates to 0.5, error jumps to 1.
    const focusProgress = useSharedValue(0);
    const errorProgress = useSharedValue(error ? 1 : 0);

    const styles = useThemeStyles((c) => ({
      column: { marginBottom: 10 },
      wrapper: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: c.surface,
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 14,
      },
      // `marginEnd` mirrors automatically in RTL layouts, unlike marginRight.
      icon: { marginEnd: 10 },
      input: { flex: 1, color: c.text, padding: 13 },
    }));

    const wrapperAnimatedStyle = useAnimatedStyle(() => ({
      borderColor: interpolateColor(
        focusProgress.value * 0.5 + errorProgress.value,
        [0, 0.5, 1],
        [colors.accentBorder, colors.accent, colors.danger],
      ),
      elevation: withTiming(errorProgress.value || focusProgress.value ? 6 : 0, {
        duration: 180,
      }),
      shadowColor: errorProgress.value ? colors.danger : colors.accent,
    }));

    const handleFocus = useCallback(
      (event: Parameters<NonNullable<TextInputProps["onFocus"]>>[0]) => {
        setFocused(true);
        focusProgress.value = withTiming(1, { duration: 180 });
        onFocus?.(event);
      },
      [focusProgress, onFocus],
    );

    const handleBlur = useCallback(
      (event: Parameters<NonNullable<TextInputProps["onBlur"]>>[0]) => {
        setFocused(false);
        focusProgress.value = withTiming(0, { duration: 180 });
        onBlur?.(event);
      },
      [focusProgress, onBlur],
    );

    // Keep the shared value in sync when the error prop changes externally.
    useEffect(() => {
      errorProgress.value = withTiming(error ? 1 : 0, { duration: 180 });
    }, [error, errorProgress]);

    return (
      <View style={[styles.column, containerStyle]}>
        <Animated.View style={[styles.wrapper, wrapperAnimatedStyle]}>
          {Icon ? (
            <Icon
              size={20}
              color={
                error
                  ? colors.danger
                  : focused
                    ? colors.accentText
                    : colors.textSubtle
              }
              style={styles.icon}
            />
          ) : null}
          <CustomTextInput
            ref={ref}
            style={[styles.input, style]}
            placeholderTextColor={colors.textSubtle}
            onFocus={handleFocus}
            onBlur={handleBlur}
            // React Native has no generic `textbox` accessibility role. Native
            // TextInput already exposes the correct editable-field semantics,
            // so callers can pass a role only when they need to override it.
            accessibilityRole={accessibilityRole}
            // Enables Android/Google credential-manager autofill for the field.
            importantForAutofill={importantForAutofill}
            {...props}
          />
          {rightSlot}
        </Animated.View>
        <AuthFieldError message={error ?? null} />
      </View>
    );
  }),
);

AuthInput.displayName = "AuthInput";

export default AuthInput;
