import React, { memo } from "react";
import { View, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import type { ProfileEmptyLibraryCardProps } from "./types";

/** Shown when the library is empty, pointing the user at the games tab. */
const ProfileEmptyLibraryCard = memo(
  ({ onBrowse }: ProfileEmptyLibraryCardProps): React.ReactElement => {
    const { t } = useTranslation();

    const styles = useThemeStyles((c) => ({
      emptyCard: {
        backgroundColor: c.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: c.border,
        padding: 16,
        marginTop: 12,
      },
      emptyText: {
        color: c.textMuted,
        fontSize: 14,
        textAlign: "center",
        marginBottom: 14,
      },
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
    }));

    return (
      <View style={styles.emptyCard}>
        <CustomText style={styles.emptyText}>
          {t("settings.profileShowcase.emptyLibrary")}
        </CustomText>
        <TouchableOpacity style={styles.primaryBtn} onPress={onBrowse}>
          <CustomText style={styles.primaryText}>
            {t("settings.profileShowcase.browseGames")}
          </CustomText>
        </TouchableOpacity>
      </View>
    );
  },
);

ProfileEmptyLibraryCard.displayName = "ProfileEmptyLibraryCard";
export default ProfileEmptyLibraryCard;
