import React, { memo } from "react";
import { useTranslation } from "react-i18next";
import CustomTextInput from "@/src/components/CustomTextInput";
import SectionTitle from "@/src/components/SectionTitle";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import type { ProfileNameFieldProps } from "./types";

/** The editable display name. */
const ProfileNameField = memo(
  ({ value, onChangeText }: ProfileNameFieldProps): React.ReactElement => {
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
        <SectionTitle title={t("settings.profile.nameLabel")} />
        <CustomTextInput
          style={styles.input}
          placeholder={t("settings.profile.placeholders.name")}
          placeholderTextColor={colors.textSubtle}
          value={value}
          onChangeText={onChangeText}
        />
      </>
    );
  },
);

ProfileNameField.displayName = "ProfileNameField";
export default ProfileNameField;
