import React, { memo } from "react";
import { View, TouchableOpacity } from "react-native";
import { Trash2 } from "lucide-react-native";
import CustomText from "@/src/components/CustomText";
import { withAlpha } from "@/src/constants/colorUtils";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";

export type DeleteAccountButtonProps = {
  label: string;
  onPress: () => void;
};

/** Red "Delete Account" button for the Edit Profile screen. */
const DeleteAccountButton = memo(
  ({ label, onPress }: DeleteAccountButtonProps): React.ReactElement => {
    const colors = useThemeColors();

    const styles = useThemeStyles((c) => ({
      container: {
        marginTop: 10,
        marginBottom: 24,
        alignSelf: "stretch",
      },
      button: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: 15,
        backgroundColor: withAlpha(c.danger, 0.12),
        borderRadius: 12,
        borderWidth: 1,
        borderColor: withAlpha(c.danger, 0.6),
      },
      icon: {
        marginRight: 8,
      },
      text: {
        fontSize: 16,
        fontWeight: "600",
        color: c.danger,
      },
    }));

    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.button} onPress={onPress} activeOpacity={0.7}>
          <Trash2 size={20} color={colors.danger} style={styles.icon} />
          <CustomText style={styles.text}>{label}</CustomText>
        </TouchableOpacity>
      </View>
    );
  },
);

DeleteAccountButton.displayName = "DeleteAccountButton";
export default DeleteAccountButton;
