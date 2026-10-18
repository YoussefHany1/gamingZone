import React, { memo } from "react";
import { View, TouchableOpacity } from "react-native";
import { LogOut } from "lucide-react-native";
import CustomText from "@/src/components/CustomText";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import type { SettingsSignOutButtonProps } from "./types";

/** Destructive sign-out row, shown only for signed-in (non-anonymous) users. */
const SettingsSignOutButton = memo(
  ({ label, onPress }: SettingsSignOutButtonProps): React.ReactElement => {
    const styles = useThemeStyles(() => ({
      signOutButton: {
        marginVertical: 10,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 16,
        backgroundColor: "rgba(221, 119, 119, 0.2)",
        borderRadius: 12,
      },
      signOutLeft: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
      },
      signOutIcon: {
        marginRight: 8,
      },
      signOutText: {
        fontSize: 18,
        fontWeight: "600",
        color: "red",
      },
    }));

    return (
      <TouchableOpacity style={styles.signOutButton} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.signOutLeft}>
          <LogOut size={20} color="red" style={styles.signOutIcon} />
          <CustomText style={styles.signOutText}>{label}</CustomText>
        </View>
      </TouchableOpacity>
    );
  },
);

SettingsSignOutButton.displayName = "SettingsSignOutButton";
export default SettingsSignOutButton;
