import React, { memo } from "react";
import { View, TouchableOpacity } from "react-native";
import { Mars, Venus } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import SectionTitle from "@/src/components/SectionTitle";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import type { ProfileGenderSelectorProps } from "./types";

/** Single-select gender row. */
const ProfileGenderSelector = memo(
  ({ value, onChange }: ProfileGenderSelectorProps): React.ReactElement => {
    const colors = useThemeColors();
    const { t } = useTranslation();

    const styles = useThemeStyles((c) => ({
      container: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "flex-start",
        marginBottom: 20,
        gap: 10,
      },
      button: {
        width: "30%",
        minWidth: "45%",
        backgroundColor: c.surface,
        borderRadius: 12,
        padding: 15,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "transparent",
      },
      buttonSelected: {
        backgroundColor: c.accentSurface,
        borderColor: c.accent,
      },
      buttonText: {
        color: c.textMuted,
        marginTop: 8,
        fontSize: 12,
        fontWeight: "600",
        textAlign: "center",
      },
      buttonTextSelected: {
        color: c.accentText,
      },
    }));

    const options = [
      { id: "male", icon: Mars, label: t("auth.register.male") || "Male" },
      { id: "female", icon: Venus, label: t("auth.register.female") || "Female" },
    ];

    return (
      <>
        <SectionTitle title={t("settings.profile.genderLabel")} />
        <View style={styles.container}>
          {options.map((option) => {
            const isSelected = value === option.id;
            const Icon = option.icon;

            return (
              <TouchableOpacity
                key={option.id}
                style={[styles.button, isSelected && styles.buttonSelected]}
                onPress={() => onChange(option.id)}
                activeOpacity={0.7}
              >
                <Icon size={32} color={isSelected ? colors.text : colors.textMuted} />
                <CustomText
                  style={[styles.buttonText, isSelected && styles.buttonTextSelected]}
                >
                  {option.label}
                </CustomText>
              </TouchableOpacity>
            );
          })}
        </View>
      </>
    );
  },
);

ProfileGenderSelector.displayName = "ProfileGenderSelector";
export default ProfileGenderSelector;
