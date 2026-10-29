import React, { memo } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { AtSign, Cpu, Gamepad2, List } from "lucide-react-native";
import SectionTitle from "@/src/components/SectionTitle";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import ProfileMenuItem from "./ProfileMenuItem";
import type { ProfileMenuProps } from "./types";

const ProfileMenu = memo(
  ({ onPublicProfile, onMyLists, onPcSpecs, onConnectedApps }: ProfileMenuProps): React.ReactElement => {
    const { t } = useTranslation();

    const styles = useThemeStyles((c) => ({
      container: {
        marginTop: 24,
      },
      card: {
        backgroundColor: c.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: c.border,
        overflow: "hidden",
      },
    }));

    return (
      <View style={styles.container}>
        <SectionTitle title={t("settings.profileShowcase.accountAndData")} />
        <View style={styles.card}>
          <ProfileMenuItem
            icon={AtSign}
            label={t("social.profile.viewPublicProfile")}
            onPress={onPublicProfile}
          />
          <ProfileMenuItem
            icon={List}
            label={t("settings.profileShowcase.myLists")}
            onPress={onMyLists}
          />
          <ProfileMenuItem
            icon={Cpu}
            label={t("settings.profileShowcase.pcSpecs")}
            onPress={onPcSpecs}
          />
          <ProfileMenuItem
            icon={Gamepad2}
            label={t("settings.profile.connectedApps") || t("settings.profile.linking.title") || "Connected Apps"}
            onPress={onConnectedApps}
            showDivider={false}
          />
        </View>
      </View>
    );
  },
);

ProfileMenu.displayName = "ProfileMenu";
export default ProfileMenu;
