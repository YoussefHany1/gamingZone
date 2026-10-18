import React, { memo } from "react";
import { TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import type { ProfileActionsProps } from "./types";

/** The edit-profile and my-lists shortcuts at the bottom of the profile. */
const ProfileActions = memo(
  ({ onEditProfile, onMyLists }: ProfileActionsProps): React.ReactElement => {
    const { t } = useTranslation();

    const styles = useThemeStyles((c) => ({
      primaryBtn: {
        backgroundColor: c.accent,
        borderRadius: 12,
        paddingVertical: 15,
        alignItems: "center",
        marginTop: 22,
      },
      primaryText: {
        color: c.onAccent,
        fontSize: 16,
        fontWeight: "700",
      },
      secondaryBtn: {
        backgroundColor: c.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: c.border,
        paddingVertical: 15,
        alignItems: "center",
        marginTop: 12,
      },
      secondaryText: {
        color: c.text,
        fontSize: 16,
        fontWeight: "600",
      },
    }));

    return (
      <>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={onEditProfile}
          activeOpacity={0.8}
        >
          <CustomText style={styles.primaryText}>
            {t("settings.profileShowcase.editProfile")}
          </CustomText>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={onMyLists}
          activeOpacity={0.8}
        >
          <CustomText style={styles.secondaryText}>
            {t("settings.profileShowcase.myLists")}
          </CustomText>
        </TouchableOpacity>
      </>
    );
  },
);

ProfileActions.displayName = "ProfileActions";
export default ProfileActions;
