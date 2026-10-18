import React, { memo } from "react";
import { useTranslation } from "react-i18next";
import CustomPicker from "@/src/components/CustomPicker";
import SectionTitle from "@/src/components/SectionTitle";
import type { ProfileCountryPickerProps } from "./types";

/** Country of residence, chosen from the localised country list. */
const ProfileCountryPicker = memo(
  ({ options, value, onChange }: ProfileCountryPickerProps): React.ReactElement => {
    const { t } = useTranslation();

    return (
      <>
        <SectionTitle title={t("settings.profile.countryLabel")} />
        <CustomPicker
          options={options}
          selectedValue={value}
          onValueChange={onChange}
          placeholder={t("settings.profile.placeholders.country") || "Select Country"}
        />
      </>
    );
  },
);

ProfileCountryPicker.displayName = "ProfileCountryPicker";
export default ProfileCountryPicker;
