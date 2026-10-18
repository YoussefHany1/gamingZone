import React, { memo } from "react";
import { View, TouchableOpacity } from "react-native";
import { Bell } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useBottomInset } from "@/src/hooks/useBottomInset";
import NotificationService from "@/src/services/notificationService";

/** Fires a local notification so delivery can be verified on the device. */
const NotificationTestButton = memo((): React.ReactElement => {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const bottomInset = useBottomInset();

  const styles = useThemeStyles(
    (c) => ({
      footer: {
        paddingTop: 15,
        paddingBottom: bottomInset,
        paddingHorizontal: 16,
      },
      testButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: c.accent,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        marginBottom: 12,
      },
      testButtonText: {
        color: c.onAccent,
        fontSize: 16,
        fontWeight: "600",
        marginLeft: 8,
      },
    }),
    [bottomInset],
  );

  return (
    <View style={styles.footer}>
      <TouchableOpacity
        style={styles.testButton}
        onPress={NotificationService.testLocalNotification}
      >
        <Bell size={20} color={colors.onAccent} />
        <CustomText style={styles.testButtonText}>
          {t("settings.notifications.testNotification")}
        </CustomText>
      </TouchableOpacity>
    </View>
  );
});

NotificationTestButton.displayName = "NotificationTestButton";
export default NotificationTestButton;
