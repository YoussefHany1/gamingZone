import React, { memo } from "react";
import { TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import DateTimePicker from "@react-native-community/datetimepicker";
import CustomTextInput from "@/src/components/CustomTextInput";
import SectionTitle from "@/src/components/SectionTitle";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import type { ProfileDobFieldProps } from "./types";

/**
 * Date of birth. The field itself is read-only — tapping it opens the native
 * picker, which is rendered inline beneath the field on Android and inline in
 * the same way on iOS (`display="default"`).
 */
const ProfileDobField = memo(
  ({
    value,
    isPickerVisible,
    onOpenPicker,
    onChange,
  }: ProfileDobFieldProps): React.ReactElement => {
    const colors = useThemeColors();
    const { t } = useTranslation();

    const styles = useThemeStyles((c) => ({
      input: {
        width: "100%",
        backgroundColor: c.surface,
        color: c.text,
        padding: 15,
        borderRadius: 5,
        marginBottom: 20,
        fontSize: 16,
      },
    }));

    return (
      <>
        <SectionTitle title={t("settings.profile.dobLabel")} />
        <TouchableOpacity onPress={onOpenPicker}>
          <CustomTextInput
            style={styles.input}
            placeholder={t("settings.profile.placeholders.dob")}
            placeholderTextColor={colors.textSubtle}
            value={value}
            editable={false}
          />
        </TouchableOpacity>
        {isPickerVisible && (
          <DateTimePicker
            mode="date"
            display="default"
            value={value ? new Date(value) : new Date()}
            onChange={onChange}
          />
        )}
      </>
    );
  },
);

ProfileDobField.displayName = "ProfileDobField";
export default ProfileDobField;
