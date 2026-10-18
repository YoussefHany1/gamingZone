import React, { memo, useCallback } from "react";
import { View, TouchableOpacity } from "react-native";
import { Lightbulb, MessageSquare, TriangleAlert } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import type { FeedbackType } from "../../types";
import type { FeedbackTypeSelectorProps } from "./types";

type TypeButtonProps = {
  value: FeedbackType;
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  onPress: (value: FeedbackType) => void;
};

const TypeButton = memo(
  ({ value, icon: Icon, label, isActive, onPress }: TypeButtonProps): React.ReactElement => {
    const colors = useThemeColors();

    const styles = useThemeStyles((c) => ({
      typeButton: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 10,
        borderRadius: 8,
        marginHorizontal: 4,
        borderWidth: 1,
        borderColor: c.accent,
      },
      typeButtonActive: {
        backgroundColor: c.accent,
        borderColor: c.accent,
      },
      typeText: {
        marginTop: 5,
        fontSize: 12,
        color: c.text,
        fontWeight: "bold",
        textAlign: "center",
      },
      typeTextActive: { color: c.onAccent },
    }));

    const handlePress = useCallback((): void => onPress(value), [onPress, value]);

    return (
      <TouchableOpacity
        style={[styles.typeButton, isActive && styles.typeButtonActive]}
        onPress={handlePress}
      >
        <Icon size={24} color={isActive ? colors.onAccent : colors.text} />
        <CustomText style={[styles.typeText, isActive && styles.typeTextActive]}>
          {label}
        </CustomText>
      </TouchableOpacity>
    );
  },
);
TypeButton.displayName = "TypeButton";

/** The suggestion / problem / other radio row. */
const FeedbackTypeSelector = memo(
  ({ value, onChange }: FeedbackTypeSelectorProps): React.ReactElement => {
    const { t } = useTranslation();

    const styles = useThemeStyles((c) => ({
      label: {
        color: c.text,
        fontSize: 16,
        marginBottom: 10,
        fontWeight: "bold",
        textAlign: "left",
      },
      typesContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 20,
      },
    }));

    return (
      <>
        <CustomText style={styles.label}>{t("settings.contact.typeLabel")}</CustomText>
        <View style={styles.typesContainer}>
          <TypeButton
            value="suggestion"
            icon={Lightbulb}
            label={t("settings.contact.types.suggestion")}
            isActive={value === "suggestion"}
            onPress={onChange}
          />
          <TypeButton
            value="problem"
            icon={TriangleAlert}
            label={t("settings.contact.types.problem")}
            isActive={value === "problem"}
            onPress={onChange}
          />
          <TypeButton
            value="other"
            icon={MessageSquare}
            label={t("settings.contact.types.other")}
            isActive={value === "other"}
            onPress={onChange}
          />
        </View>
      </>
    );
  },
);

FeedbackTypeSelector.displayName = "FeedbackTypeSelector";
export default FeedbackTypeSelector;
