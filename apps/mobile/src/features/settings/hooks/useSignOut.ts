import { useCallback } from "react";
import { Alert } from "react-native";
import auth from "@react-native-firebase/auth";
import { useTranslation } from "react-i18next";

export type UseSignOutResult = {
  /** Asks for confirmation, then signs out. */
  confirmSignOut: () => void;
};

/**
 * Owns the sign-out flow.
 *
 * The auth store's `onAuthStateChanged` listener falls back to an anonymous
 * session when the user becomes null, so signing out here must not also start
 * a session itself — two concurrent sign-ins would race each other.
 */
export function useSignOut(): UseSignOutResult {
  const { t } = useTranslation();

  const handleSignOut = useCallback(async (): Promise<void> => {
    try {
      await auth().signOut();
    } catch {
      Alert.alert(t("settings.signOut.errorTitle"), t("settings.signOut.errorMessage"));
    }
  }, [t]);

  const confirmSignOut = useCallback((): void => {
    Alert.alert(
      t("settings.signOut.confirmTitle") || "Sign Out",
      t("settings.signOut.confirmMessage") || "Are you sure you want to sign out?",
      [
        { text: t("common.cancel") || "Cancel", style: "cancel" },
        {
          text: t("settings.menu.signOut") || "Sign Out",
          style: "destructive",
          onPress: handleSignOut,
        },
      ],
    );
  }, [handleSignOut, t]);

  return { confirmSignOut };
}
