import React, { memo } from "react";
import { View, TouchableOpacity } from "react-native";
import { LogOut, Trash2 } from "lucide-react-native";
import CustomText from "@/src/components/CustomText";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import type { SettingsSignOutButtonProps } from "./types";

export type SettingsActionButtonProps = {
  label: string;
  onPress: () => void;
  variant?: "signOut" | "delete";
};

/** Destructive sign-out / delete-account row, shown only for signed-in (non-anonymous) users. */
const SettingsActionButton = memo(
  ({ label, onPress, variant = "signOut" }: SettingsActionButtonProps): React.ReactElement => {
    const isDelete = variant === "delete";
    const styles = useThemeStyles(() => ({
      button: {
        marginVertical: 10,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 16,
        backgroundColor: isDelete
          ? "rgba(220, 38, 38, 0.15)"
          : "rgba(221, 119, 119, 0.2)",
        borderRadius: 12,
      },
      left: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
      },
      icon: {
        marginRight: 8,
      },
      text: {
        fontSize: 18,
        fontWeight: "600",
        color: isDelete ? "#dc2626" : "red",
      },
    }));

    const Icon = isDelete ? Trash2 : LogOut;

    return (
      <TouchableOpacity style={styles.button} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.left}>
          <Icon size={20} color={isDelete ? "#dc2626" : "red"} style={styles.icon} />
          <CustomText style={styles.text}>{label}</CustomText>
        </View>
      </TouchableOpacity>
    );
  },
);

SettingsActionButton.displayName = "SettingsActionButton";
export { SettingsActionButton };
export default SettingsActionButton;
