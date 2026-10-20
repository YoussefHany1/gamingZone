import React, { memo, useCallback } from "react";
import { View, TouchableOpacity } from "react-native";
import { Check } from "lucide-react-native";
import CustomText from "@/src/components/CustomText";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import type { LanguageOptionRowProps } from "./types";

/**
 * A single selectable language.
 *
 * Arabic is written right-to-left regardless of the app's current direction, so
 * the row's direction and the label's writing direction are driven by the
 * language on offer rather than by the active one.
 */
const LanguageOptionRow = memo(
  ({ code, label, isSelected, onSelect }: LanguageOptionRowProps): React.ReactElement => {
    const colors = useThemeColors();
    const isRtl = code === "ar";

    const styles = useThemeStyles((c) => ({
      row: {
        marginVertical: 15,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 16,
        backgroundColor: c.surface,
        borderRadius: 12,
      },
      rowLtr: { direction: "ltr" },
      rowRtl: { direction: "rtl" },
      rowInner: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        flex: 1,
      },
      rowInnerLtr: { direction: "ltr" },
      rowInnerRtl: { direction: "rtl" },
      title: {
        fontSize: 18,
        fontWeight: "600",
        color: c.text,
        marginHorizontal: 8,
      },
      titleLtr: { writingDirection: "ltr", textAlign: "left" },
      titleRtl: { writingDirection: "rtl", textAlign: "right" },
    }));

    const handlePress = useCallback((): void => onSelect(code), [code, onSelect]);

    return (
      <TouchableOpacity
        style={[styles.row, isRtl ? styles.rowRtl : styles.rowLtr]}
        onPress={handlePress}
      >
        <View style={[styles.rowInner, isRtl ? styles.rowInnerRtl : styles.rowInnerLtr]}>
          <CustomText style={[styles.title, isRtl ? styles.titleRtl : styles.titleLtr]}>
            {label}
          </CustomText>
          {isSelected && <Check size={24} color={colors.accentText}/>}
        </View>
      </TouchableOpacity>
    );
  },
);

LanguageOptionRow.displayName = "LanguageOptionRow";
export default LanguageOptionRow;
