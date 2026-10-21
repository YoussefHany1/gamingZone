import React, { memo, useEffect, useState } from "react";
import { View, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import { Gamepad2 } from "lucide-react-native";
import CustomText from "@/src/components/CustomText";
import SectionTitle from "@/src/components/SectionTitle";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { logger } from "@/src/lib/logger";

/**
 * "Connected Apps" entry point — opens LinkAccountModal where the user
 * sign-ins with Steam (OpenID) / PlayStation (NPSSO) / Xbox (Microsoft OAuth)
 * and manages library auto-imports.
 *
 * Doubles as the Settings badge for auto-sync failures: when the backend
 * flags an account `reauth_required`, an amber dot appears here — auto-sync
 * itself never toasts.
 */
const LinkedAccountsButton = memo(
  ({ onPress }: { onPress: () => void }): React.ReactElement => {
    const colors = useThemeColors();
    const { t } = useTranslation();
    const [hasReauth, setHasReauth] = useState(false);
    const badgeStyles = useThemeStyles((c) => ({
      dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: c.danger,
        marginLeft: 8,
      },
    }));

    useEffect(() => {
      const uid = auth().currentUser?.uid;
      if (!uid) {
        setHasReauth(false);
        return;
      }
      const ref = firestore().collection("users").doc(uid).collection("linkedAccounts");
      // Track the LATEST status per platform so the badge clears again on a
      // successful reconnect.
      const statuses: Record<string, string | undefined> = {};
      const applyStatuses = () => {
        const values = Object.values(statuses);
        setHasReauth(values.length > 0 && values.some((status) => status === "reauth_required"));
      };
      const subs = (["steam", "psn", "xbox"] as const).map((platform) =>
        ref.doc(platform).onSnapshot(
          (snap) => {
            statuses[platform] = snap.data()?.status as string | undefined;
            applyStatuses();
          },
          (error) => {
            logger.warn("[LinkedAccountsButton] listener error:", error);
          },
        ),
      );
      return () => subs.forEach((fn) => fn());
    }, []);

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
            <Gamepad2 size={24} color={colors.onAccent} />
          </View>
          <CustomText style={styles.text} numberOfLines={1}>
            {t("settings.profile.linking.title") || "Sync Your Game Library"}
          </CustomText>
          {hasReauth && <View style={badgeStyles.dot} />}
        </TouchableOpacity>
      </>
    );
  },
);

LinkedAccountsButton.displayName = "LinkedAccountsButton";
export default LinkedAccountsButton;
