import { StyleSheet, TextStyle } from "react-native";

// Compiled once at module load — zero overhead on every call
const ARABIC_REGEX =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

/**
 * Returns true if the string contains at least one Arabic character.
 * Uses a module-level regex so it is compiled only once.
 */
export function containsArabic(text: string): boolean {
  return text.length > 0 && ARABIC_REGEX.test(text);
}

const CAIRO_FONT_MAP: Record<string, string> = {
  "100": "Cairo-Regular",
  "200": "Cairo-Regular",
  "300": "Cairo-Regular",
  "400": "Cairo-Regular",
  normal: "Cairo-Regular",
  "500": "Cairo-Medium",
  medium: "Cairo-Medium",
  "600": "Cairo-SemiBold",
  semibold: "Cairo-SemiBold",
  "700": "Cairo-Bold",
  bold: "Cairo-Bold",
  "800": "Cairo-Bold",
  "900": "Cairo-Bold",
  heavy: "Cairo-Bold",
  black: "Cairo-Bold",
};

const DEFAULT_CAIRO_FONT = "Cairo-Regular";

const INTER_FONT_MAP: Record<string, string> = {
  "100": "Inter-Regular",
  "200": "Inter-Regular",
  "300": "Inter-Regular",
  "400": "Inter-Regular",
  normal: "Inter-Regular",
  "500": "Inter-Medium",
  medium: "Inter-Medium",
  "600": "Inter-SemiBold",
  semibold: "Inter-SemiBold",
  "700": "Inter-Bold",
  bold: "Inter-Bold",
  "800": "Inter-Bold",
  "900": "Inter-Bold",
  heavy: "Inter-Bold",
  black: "Inter-Bold",
};

const DEFAULT_INTER_FONT = "Inter-Regular";

const ROBOTO_FONT_MAP: Record<string, string> = {
  "100": "Roboto-Regular",
  "200": "Roboto-Regular",
  "300": "Roboto-Regular",
  "400": "Roboto-Regular",
  normal: "Roboto-Regular",
  "500": "Roboto-Medium",
  medium: "Roboto-Medium",
  "600": "Roboto-SemiBold",
  semibold: "Roboto-SemiBold",
  "700": "Roboto-Bold",
  bold: "Roboto-Bold",
  "800": "Roboto-Bold",
  "900": "Roboto-Bold",
  heavy: "Roboto-Bold",
  black: "Roboto-Bold",
};

const DEFAULT_ROBOTO_FONT = "Roboto-Regular";

/**
 * Resolves the correct fontFamily from a flattened style object.
 * - Arabic text → Maps fontWeight to static Cairo font (e.g. Cairo-Bold)
 * - Non-Arabic text → "Roboto"
 * - explicit fontFamily in style → always wins (e.g. "Inter")
 *
 * fontWeight is stripped from the returned flatStyle to prevent Android
 * from falling back to default fonts when trying to apply weight to custom fonts.
 */
export function resolveFontStyle(
  style: TextStyle | TextStyle[] | null | undefined,
  isArabic: boolean,
): {
  resolvedFontFamily: string;
  flatStyle: Omit<TextStyle, "fontFamily">;
} {
  const flat = StyleSheet.flatten(style) ?? {};
  const { fontFamily: explicitFont, fontWeight, ...rest } = flat as TextStyle;

  const weightKey = fontWeight ? String(fontWeight) : "default";
  
  let baseFamily = explicitFont;
  if (!baseFamily) {
    baseFamily = isArabic ? "Cairo" : "Roboto";
  }

  // Handle static Cairo font mapping
  if (baseFamily === "Cairo" || baseFamily?.startsWith("Cairo-")) {
    const resolvedFontFamily = CAIRO_FONT_MAP[weightKey] ?? DEFAULT_CAIRO_FONT;
    return { resolvedFontFamily, flatStyle: rest };
  }
  
  // Handle static Inter font mapping
  if (baseFamily === "Inter" || baseFamily?.startsWith("Inter-")) {
    const resolvedFontFamily = INTER_FONT_MAP[weightKey] ?? DEFAULT_INTER_FONT;
    return { resolvedFontFamily, flatStyle: rest };
  }

  // Handle static Roboto font mapping
  if (baseFamily === "Roboto" || baseFamily?.startsWith("Roboto-")) {
    const resolvedFontFamily = ROBOTO_FONT_MAP[weightKey] ?? DEFAULT_ROBOTO_FONT;
    return { resolvedFontFamily, flatStyle: rest };
  }

  // Keep fontWeight for other variable fonts or explicit fonts
  return { resolvedFontFamily: baseFamily, flatStyle: { ...rest, fontWeight } };
}

/** Font assets — loaded once in App.tsx via useFonts() */
export const APP_FONTS = {
  "Cairo-Regular": require("../../assets/font/cairo/Cairo-Regular.ttf"),
  "Cairo-Medium": require("../../assets/font/cairo/Cairo-Medium.ttf"),
  "Cairo-SemiBold": require("../../assets/font/cairo/Cairo-SemiBold.ttf"),
  "Cairo-Bold": require("../../assets/font/cairo/Cairo-Bold.ttf"),
  "Inter-Regular": require("../../assets/font/Inter/Inter_18pt-Regular.ttf"),
  "Inter-Medium": require("../../assets/font/Inter/Inter_18pt-Medium.ttf"),
  "Inter-SemiBold": require("../../assets/font/Inter/Inter_18pt-SemiBold.ttf"),
  "Inter-Bold": require("../../assets/font/Inter/Inter_18pt-Bold.ttf"),
  "Roboto-Regular": require("../../assets/font/Roboto/Roboto-Regular.ttf"),
  "Roboto-Medium": require("../../assets/font/Roboto/Roboto-Medium.ttf"),
  "Roboto-SemiBold": require("../../assets/font/Roboto/Roboto-SemiBold.ttf"),
  "Roboto-Bold": require("../../assets/font/Roboto/Roboto-Bold.ttf"),
} as const;
