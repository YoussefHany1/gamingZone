import React, { useMemo } from "react";
import { Text, TextProps, TextStyle } from "react-native";
import { resolveFontStyle, containsArabic } from "../utils/fontUtils";

/** Recursively extracts plain text from React children for language detection. */
const getTextContent = (children: React.ReactNode): string => {
  if (typeof children === "string") return children;
  if (typeof children === "number") return children.toString();
  if (Array.isArray(children)) return children.map(getTextContent).join("");
  return "";
};

const CustomText = React.memo<TextProps>(({ style, children, ...props }) => {
  // Memoised: recomputed only when children or style change
  const { resolvedFontFamily, flatStyle } = useMemo(() => {
    const text = getTextContent(children);
    const isArabic = containsArabic(text);
    return resolveFontStyle(style as TextStyle | TextStyle[] | null | undefined, isArabic);
  }, [children, style]);

  return (
    <Text style={[flatStyle, { fontFamily: resolvedFontFamily }]} {...props}>
      {children}
    </Text>
  );
});

CustomText.displayName = "CustomText";

export default CustomText;
