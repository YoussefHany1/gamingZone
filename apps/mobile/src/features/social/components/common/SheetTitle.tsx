import React from "react";
import type { StyleProp, TextStyle } from "react-native";
import CustomText from "@/src/components/CustomText";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";

export type SheetTitleProps = {
  /** Already-translated title (i18n stays at the call site). */
  title: string;
  style?: StyleProp<TextStyle>;
};

/** The standard sheet heading shared by every social bottom sheet. */
export default function SheetTitle({ title, style }: SheetTitleProps): React.ReactElement {
  const styles = useThemeStyles((c) => ({
    title: { color: c.text, fontSize: 20, fontWeight: "900", marginBottom: 14 },
  }));
  return <CustomText style={[styles.title, style]}>{title}</CustomText>;
}
