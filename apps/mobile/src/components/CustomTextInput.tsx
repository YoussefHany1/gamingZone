import React, { useMemo } from "react";
import { TextInput, TextInputProps, TextStyle } from "react-native";
import { resolveFontStyle, containsArabic } from "../utils/fontUtils";

/**
 * Drop-in replacement for React Native's <TextInput>.
 * Automatically selects Cairo for Arabic text or Roboto for other text,
 * based on value → defaultValue → placeholder (first non-empty wins).
 * Uses React.forwardRef for programmatic focus control.
 */
const CustomTextInput = React.forwardRef<TextInput, TextInputProps>(
  ({ style, value, defaultValue, placeholder, ...props }, ref) => {
    // Memoised: recomputed only when the analysed text or style changes
    const { resolvedFontFamily, flatStyle } = useMemo(() => {
      const textToAnalyze = value ?? defaultValue ?? placeholder ?? "";
      const isArabic = containsArabic(textToAnalyze);
      return resolveFontStyle(style as TextStyle | TextStyle[] | null | undefined, isArabic);
    }, [value, defaultValue, placeholder, style]);

    return (
      <TextInput
        ref={ref}
        value={value}
        defaultValue={defaultValue}
        placeholder={placeholder}
        style={[flatStyle, { fontFamily: resolvedFontFamily }]}
        {...props}
      />
    );
  },
);

CustomTextInput.displayName = "CustomTextInput";

export default CustomTextInput;
