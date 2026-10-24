/**
 * Discord sign-in flow shared by the Login and Register screens.
 *
 * The OAuth handshake itself lives in `lib/discordAuthFlow` so account
 * re-authentication can reuse it without triggering navigation. This hook only
 * handles the loading state, the custom-token exchange and user-facing errors.
 */
import { useCallback } from "react";
import auth from "@react-native-firebase/auth";
import { useTranslation } from "react-i18next";
import { runDiscordAuthFlow } from "@/src/features/auth/lib/discordAuthFlow";
import { logger } from "@/src/lib/logger";
import { showToast } from "@/src/lib/toast";

export type UseDiscordAuthParams = {
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  /** Invoked after a successful sign-in (e.g. `replace("MainApp")`). */
  onSuccess: () => void;
};

export function useDiscordAuth({
  isLoading,
  setLoading,
  onSuccess,
}: UseDiscordAuthParams): () => Promise<void> {
  const { t } = useTranslation();

  return useCallback(async (): Promise<void> => {
    if (isLoading) return;
    setLoading(true);

    try {
      const result = await runDiscordAuthFlow();

      if (result.status === "success") {
        await auth().signInWithCustomToken(result.customToken);
        onSuccess();
        return;
      }

      if (result.status === "not_configured") {
        showToast(t("auth.errors.discordNotConfigured"));
      } else if (result.status === "failed") {
        showToast(t("auth.errors.discordSignIn"));
      }
      // "cancelled" is a user decision — stay on the auth screen silently.
    } catch (error) {
      logger.error("[DiscordAuth] sign-in failed", error);
      showToast(t("auth.errors.discordSignIn"));
    } finally {
      setLoading(false);
    }
  }, [isLoading, setLoading, onSuccess, t]);
}
