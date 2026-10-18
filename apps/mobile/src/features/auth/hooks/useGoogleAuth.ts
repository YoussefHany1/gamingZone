import { useCallback } from "react";
import { ToastAndroid } from "react-native";
import auth from "@react-native-firebase/auth";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import Constants from "expo-constants";
import { useTranslation } from "react-i18next";
import { logger } from "@/src/lib/logger";

// Configure once at module load — shared by every auth screen that imports
// this hook (previously duplicated in Login and Register).
const { GOOGLE_WEB_CLIENT_ID } = Constants.expoConfig?.extra ?? {};
GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });

export type UseGoogleAuthParams = {
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  /** Invoked after a successful credential sign-in (e.g. `replace("MainApp")`). */
  onSuccess: () => void;
};

/**
 * Google sign-in flow shared by the Login and Register screens: play-services
 * check → native sign-in → Firebase credential exchange. User cancellations
 * are ignored; other failures surface a toast.
 */
export function useGoogleAuth({
  isLoading,
  setLoading,
  onSuccess,
}: UseGoogleAuthParams): () => Promise<void> {
  const { t } = useTranslation();

  return useCallback(async (): Promise<void> => {
    if (isLoading) return;
    setLoading(true);

    try {
      await GoogleSignin.hasPlayServices();
      const userInfoResponse = await GoogleSignin.signIn();
      const idToken = userInfoResponse.data?.idToken;

      if (!idToken) {
        logger.error(
          "Google sign-in error: idToken missing in response.",
          JSON.stringify(userInfoResponse),
        );
        ToastAndroid.show(t("auth.idTokenError"), ToastAndroid.LONG);
        return;
      }

      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      await auth().signInWithCredential(googleCredential);
      onSuccess();
    } catch (error) {
      // Silently ignore user-cancelled sign-in; log unexpected errors.
      const err = error as { code?: string };
      if (err.code !== statusCodes.SIGN_IN_CANCELLED) {
        logger.error("Google sign-in error", error);
        if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          ToastAndroid.show(t("auth.errors.playServices"), ToastAndroid.LONG);
        } else if (err.code !== statusCodes.IN_PROGRESS) {
          ToastAndroid.show(t("auth.errors.general"), ToastAndroid.LONG);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [isLoading, setLoading, onSuccess, t]);
}
