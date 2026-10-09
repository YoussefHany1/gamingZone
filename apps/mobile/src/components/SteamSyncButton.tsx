import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
  TextStyle,
} from "react-native";
import { useTranslation } from "react-i18next";
import { SteamIcon } from "@/src/components/icons/StoreIcons";
import CustomText from "@/src/components/CustomText";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import SteamLinkModal from "./SteamLinkModal";

export interface SteamSyncButtonProps {
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  iconSize?: number;
  label?: string;
  onPress?: () => void;
}

export default function SteamSyncButton({
  style,
  textStyle,
  iconSize = 24,
  label,
  onPress,
}: SteamSyncButtonProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [modalVisible, setModalVisible] = useState(false);

  const styles = useThemeStyles((c) => ({
    button: {
      backgroundColor: c.accent,
      padding: 14,
      borderRadius: 8,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
    },
    iconWrapper: {
      marginRight: 10,
    },
    text: {
      color: c.onAccent,
      fontWeight: "bold",
      fontSize: 16,
    },
  }));

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      setModalVisible(true);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.button, style]}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <View style={styles.iconWrapper}>
          <SteamIcon size={iconSize} fill={colors.onAccent} />
        </View>
        <CustomText style={[styles.text, textStyle]}>
          {label || t("settings.profile.steam.modal.title") || "Sync Steam Library"}
        </CustomText>
      </TouchableOpacity>

      {!onPress && (
        <SteamLinkModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
        />
      )}
    </>
  );
}
