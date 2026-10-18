import { useCallback } from "react";
import { ToastAndroid } from "react-native";
import auth from "@react-native-firebase/auth";
import { useTranslation } from "react-i18next";
import { logger } from "@/src/lib/logger";

export type UseAnonymousAuthParams = {
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  /** Invoked after successful anonymous sign-in (e.g. `replace("MainApp")`). */
  onSuccess: () => void;
};

/** Anonymous / guest sign-in shared by the Login and Register screens. */
export function useAnonymousAuth({
  isLoading,
  setLoading,
  onSuccess,
}: UseAnonymousAuthParams): () => Promise<void> {
  const { t } = useTranslation();

  return useCallback(async (): Promise<void> => {
    if (isLoading) return;
    setLoading(true);

    try {
      await auth().signInAnonymously();
      onSuccess();
    } catch (error) {
      logger.error("Anonymous login failed", error);
      ToastAndroid.show(t("auth.errors.general"), ToastAndroid.LONG);
    } finally {
      setLoading(false);
    }
  }, [isLoading, setLoading, onSuccess, t]);
}
