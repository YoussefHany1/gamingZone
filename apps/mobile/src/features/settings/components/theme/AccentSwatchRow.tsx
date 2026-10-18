import React, { memo } from "react";
import { View, TouchableOpacity } from "react-native";
import { Check, Dices, Sparkles } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import { readableForeground } from "@/src/constants/colorUtils";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { ACCENT_OPTIONS, resolveSwatchColor } from "../../lib/themeScreen";
import { geometry, SWATCH } from "./geometry";
import type { AccentSwatchRowProps } from "./types";

/** The accent picker: "auto", "random", then every concrete hue. */
const AccentSwatchRow = memo(
  ({ accent, resolvedAccent, onSelect }: AccentSwatchRowProps): React.ReactElement => {
    const colors = useThemeColors();
    const { t } = useTranslation();

    const styles = useThemeStyles((c) => ({
      sectionTitle: {
        fontSize: 11,
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: 0.8,
        color: c.textMuted,
      },
      swatchSelected: {
        borderWidth: 2.5,
        borderColor: c.text,
      },
    }));

    return (
      <View style={geometry.accentSection}>
        <CustomText style={styles.sectionTitle}>
          {t("settings.theme.accentTitle")}
        </CustomText>

        <View style={geometry.swatchRow}>
          {ACCENT_OPTIONS.map((id) => {
            const isSelected = accent === id;
            const fill = resolveSwatchColor(id, colors.accent, resolvedAccent);

            return (
              <View key={id} style={geometry.swatchCol}>
                <TouchableOpacity
                  style={geometry.swatchHit}
                  onPress={() => onSelect(id)}
                  activeOpacity={0.75}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={t(`settings.theme.${id}`)}
                >
                  <View
                    style={[
                      geometry.swatchCircle,
                      { backgroundColor: fill },
                      isSelected ? styles.swatchSelected : null,
                    ]}
                  >
                    {id === "random" && (
                      <Dices size={SWATCH / 2} color={readableForeground(fill)} />
                    )}
                    {id === "auto" && (
                      <Sparkles size={SWATCH / 2} color={readableForeground(fill)} />
                    )}
                    {isSelected && id !== "random" && id !== "auto" && (
                      <Check
                        size={SWATCH / 2.2}
                        color={readableForeground(fill)}
                        strokeWidth={3}
                      />
                    )}
                  </View>
                </TouchableOpacity>
                <CustomText style={[geometry.swatchLabel, { color: colors.textMuted }]}>
                  {t(`settings.theme.${id}`)}
                </CustomText>
              </View>
            );
          })}
        </View>
      </View>
    );
  },
);

AccentSwatchRow.displayName = "AccentSwatchRow";
export default AccentSwatchRow;
