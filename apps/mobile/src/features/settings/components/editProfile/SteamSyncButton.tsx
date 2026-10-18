import React, { memo } from "react";
import { View, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import SectionTitle from "@/src/components/SectionTitle";
import { SteamIcon } from "@/src/components/icons/StoreIcons";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import type { SteamSyncButtonProps } from "./types";

/** Opens the Steam link modal that imports the user's Steam library. */
const SteamSyncButton = memo(
  ({ onPress }: SteamSyncButtonProps): React.ReactElement => {
    const colors = useThemeColors();
    const { t } = useTranslation();

    const styles = useThemeStyles((c) => ({
      button: {
        backgroundColor: c.accent,
        borderRadius: 12,
        alignSelf: "center",
        padding: 15,
        marginTop: 10,
        marginBottom: 20,
        width: "100%",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
      },
      icon: { marginRight: 10 },
      text: {
        color: c.onAccent,
        textAlign: "center",
        fontSize: 18,
        fontWeight: "600",
      },
    }));

    return (
      <>
        <SectionTitle title={t("settings.profile.connectedApps")} />
        <TouchableOpacity style={styles.button} onPress={onPress}>
          <View style={styles.icon}>
            <SteamIcon size={24} fill={colors.onAccent} />
          </View>
          <CustomText style={styles.text}>
            {t("settings.profile.steam.modal.title") || "Sync Steam Library"}
          </CustomText>
        </TouchableOpacity>
      </>
    );
  },
);

SteamSyncButton.displayName = "SteamSyncButton";
export default SteamSyncButton;
