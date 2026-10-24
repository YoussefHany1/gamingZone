import { useCallback, useState } from "react";
import { Alert } from "react-native";
import auth from "@react-native-firebase/auth";
import { useTranslation } from "react-i18next";
import { runDiscordAuthFlow } from "@/src/features/auth/lib/discordAuthFlow";
import { GoogleSignin, statusCodes } from "@/src/features/auth/lib/googleSignIn";
import { deleteAccount } from "@/src/services/api/accountApi";
import type { DeleteAccountResult } from "@/src/services/api/accountApi";
import type { ReauthMethod } from "../types";
import { logger } from "@/src/lib/logger";

const DISCORD_SYNTHETIC_EMAIL_DOMAIN = "discord.gamingzone.app";

const BASE64_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export type UseDeleteAccountResult = {
  /** Asks for confirmation, then deletes the account and all of its data. */
  confirmDeleteAccount: () => void;
  /** State and actions for the re-authentication prompt. */
  reauth: {
    visible: boolean;
    method: ReauthMethod;
    password: string;
    errorMessage: string | null;
    isSubmitting: boolean;
    showDiscordAlternative: boolean;
    onChangePassword: (value: string) => void;
    onSubmitPassword: () => void;
    onVerifyWithGoogle: () => void;
    onVerifyWithDiscord: () => void;
    onCancel: () => void;
  };
};

/** Firebase error codes that mean the entered password was rejected. */
function isWrongPassword(code: string | undefined): boolean {
  return (
    code === "auth/wrong-password" ||
    code === "auth/invalid-credential" ||
    code === "auth/invalid-login-credentials"
  );
}

/**
 * Decodes a Firebase custom token far enough to read its `uid` claim.
 *
 * The token is only used to make sure a Discord re-authentication resolves to
 * the account that is already signed in — signing in with a token belonging to
 * another account would silently switch the user before the deletion runs.
 *
 * Note: `sub` is *not* the uid in a Firebase custom token (it is the service
 * account email), so only the explicit `uid`/`user_id` claims are trusted.
 */
function readCustomTokenUid(token: string): string | null {
  const payload = token.split(".")[1];
  if (!payload) return null;

  try {
    // base64url → JSON. The payload is ASCII for our tokens (uid + standard
    // Firebase claims), so a compact decoder is enough and avoids relying on
    // `atob`, which React Native does not provide.
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/").replace(/=+$/, "");
    let bits = 0;
    let value = 0;
    let json = "";
    for (const char of normalized) {
      const index = BASE64_ALPHABET.indexOf(char);
      if (index === -1) return null;
      value = (value << 6) | index;
      bits += 6;
      if (bits >= 8) {
        bits -= 8;
        json += String.fromCharCode((value >> bits) & 0xff);
      }
    }

    const data = JSON.parse(json) as Record<string, unknown>;
    const uid = data["uid"] ?? data["user_id"];
    return typeof uid === "string" ? uid : null;
  } catch {
    return null;
  }
}

export type UseDeleteAccountParams = {
  /** Called after the account has been deleted (e.g. to leave the screen). */
  onDeleted?: () => void;
};

/**
 * Owns the account-deletion flow.
 *
 * The deletion runs on the backend with the Admin SDK, which is the only place
 * that can remove the Auth user *and* the user-owned documents. Firebase only
 * accepts such a sensitive call from a recent sign-in, so when the server
 * reports `requires_recent_login` the user re-authenticates in place — signing
 * out would replace the session with an anonymous one — and the request is
 * retried with a freshly minted token.
 */
export function useDeleteAccount({
  onDeleted,
}: UseDeleteAccountParams = {}): UseDeleteAccountResult {
  const { t } = useTranslation();

  const [visible, setVisible] = useState(false);
  const [method, setMethod] = useState<ReauthMethod>("password");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDiscordAlternative, setShowDiscordAlternative] = useState(false);

  /** Closes the prompt and lets the host screen leave the deleted account. */
  const finishDeletion = useCallback((): void => {
    setVisible(false);
    onDeleted?.();
  }, [onDeleted]);

  /**
   * Clears the now-deleted session, then leaves the screen.
   *
   * The server already removed the Auth user, so local state has to go too;
   * signing out makes the app fall back to its anonymous sign-in. Navigation
   * happens afterwards so it cannot race that state change, and a sign-out
   * hiccup must not strand the user on a screen for an account that no longer
   * exists.
   */
  const completeDeletion = useCallback(async (): Promise<void> => {
    try {
      await auth().signOut();
    } catch (error) {
      logger.warn("Failed to clear the deleted session:", error);
    }
    finishDeletion();
  }, [finishDeletion]);

  const openReauth = useCallback((): void => {
    const user = auth().currentUser;
    if (!user) return;

    const providers = user.providerData.map((info) => info.providerId);
    const email = user.email?.toLowerCase() ?? "";
    const syntheticDiscordEmail = email.endsWith(`@${DISCORD_SYNTHETIC_EMAIL_DOMAIN}`);

    if (providers.includes("google.com")) {
      setMethod("google");
      setShowDiscordAlternative(false);
    } else if (providers.includes("password") && !syntheticDiscordEmail) {
      setMethod("password");
      // Discord sign-up stores an unknown random password, so a password
      // account may still belong to a Discord user. Keep a way out.
      setShowDiscordAlternative(true);
    } else {
      setMethod("discord");
      setShowDiscordAlternative(false);
    }

    setPassword("");
    setErrorMessage(null);
    setVisible(true);
  }, []);

  /**
   * Turns a failed deletion into user-facing feedback.
   *
   * `requires_recent_login` is the only recoverable case. Guest accounts never
   * hit it (the server skips the freshness check for them), but if one ever
   * did there is no provider to verify with, so it degrades to a generic error
   * instead of a modal that cannot be satisfied.
   */
  const showDeleteFailure = useCallback(
    (result: Extract<DeleteAccountResult, { ok: false }>): void => {
      const user = auth().currentUser;
      if (result.reason === "requires_recent_login" && user && !user.isAnonymous) {
        openReauth();
        return;
      }

      Alert.alert(
        t("settings.deleteAccount.errorTitle"),
        t("settings.deleteAccount.errorMessage"),
      );
    },
    [openReauth, t],
  );

  const attemptDelete = useCallback(async (): Promise<void> => {
    try {
      const result = await deleteAccount();
      if (result.ok) {
        await completeDeletion();
        return;
      }
      showDeleteFailure(result);
    } catch (error) {
      // `deleteAccount` reports failures instead of throwing; this is a guard
      // against a regression in that contract, not an expected path.
      logger.error("Delete account failed:", error);
      Alert.alert(
        t("settings.deleteAccount.errorTitle"),
        t("settings.deleteAccount.errorMessage"),
      );
    }
  }, [completeDeletion, showDeleteFailure, t]);

  const handleReauthError = useCallback(
    (error: unknown): void => {
      const code = (error as { code?: string }).code;
      logger.error("Re-authentication failed:", error);

      if (isWrongPassword(code)) {
        setErrorMessage(t("settings.deleteAccount.wrongPassword"));
      } else if (code === "auth/network-request-failed") {
        setErrorMessage(t("auth.errors.network"));
      } else if (code === "auth/too-many-requests") {
        setErrorMessage(t("auth.errors.tooManyRequests"));
      } else if (code === "auth/requires-recent-login") {
        setErrorMessage(t("settings.deleteAccount.reauthExpired"));
      } else {
        setErrorMessage(t("settings.deleteAccount.reauthFailed"));
      }
    },
    [t],
  );

  /**
   * Retries the deletion after a successful verification.
   *
   * A second `requires_recent_login` is not retried again: reopening the modal
   * would loop forever (it would mean the backend did not treat the fresh
   * credential as fresh).
   */
  const retryAfterReauth = useCallback(async (): Promise<void> => {
    const result = await deleteAccount();
    if (result.ok) {
      await completeDeletion();
      return;
    }

    if (result.reason === "requires_recent_login") {
      setErrorMessage(t("settings.deleteAccount.reauthExpired"));
    } else if (result.reason === "unauthenticated") {
      setErrorMessage(t("settings.deleteAccount.reauthFailed"));
    } else {
      setErrorMessage(t("settings.deleteAccount.errorMessage"));
    }
  }, [completeDeletion, t]);

  const submitPassword = useCallback(async (): Promise<void> => {
    const user = auth().currentUser;
    if (!user || isSubmitting) return;

    if (!user.email) {
      setErrorMessage(t("settings.deleteAccount.reauthFailed"));
      return;
    }
    if (!password) {
      setErrorMessage(t("settings.deleteAccount.passwordRequired"));
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const credential = auth.EmailAuthProvider.credential(user.email, password);
      await user.reauthenticateWithCredential(credential);
      setPassword("");
      await retryAfterReauth();
    } catch (error) {
      handleReauthError(error);
    } finally {
      setIsSubmitting(false);
    }
  }, [handleReauthError, isSubmitting, password, retryAfterReauth, t]);

  const verifyWithGoogle = useCallback(async (): Promise<void> => {
    const user = auth().currentUser;
    if (!user || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken;

      if (!idToken) {
        setErrorMessage(t("settings.deleteAccount.reauthFailed"));
        return;
      }

      const credential = auth.GoogleAuthProvider.credential(idToken);
      await user.reauthenticateWithCredential(credential);
      await retryAfterReauth();
    } catch (error) {
      const code = (error as { code?: string }).code;

      if (code === statusCodes.SIGN_IN_CANCELLED || code === statusCodes.IN_PROGRESS) {
        return;
      }
      if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setErrorMessage(t("settings.deleteAccount.googleUnavailable"));
        return;
      }
      if (code === "auth/user-mismatch") {
        setErrorMessage(t("settings.deleteAccount.googleAccountMismatch"));
        return;
      }
      handleReauthError(error);
    } finally {
      setIsSubmitting(false);
    }
  }, [handleReauthError, isSubmitting, retryAfterReauth, t]);

  const verifyWithDiscord = useCallback(async (): Promise<void> => {
    const user = auth().currentUser;
    if (!user || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const result = await runDiscordAuthFlow();

      if (result.status === "cancelled") return;
      if (result.status === "not_configured") {
        setErrorMessage(t("settings.deleteAccount.discordUnavailable"));
        return;
      }
      if (result.status !== "success") {
        setErrorMessage(t("settings.deleteAccount.discordFailed"));
        return;
      }

      // Never let a Discord account that resolves to a different uid replace
      // the signed-in account — the deletion would target the wrong user.
      if (readCustomTokenUid(result.customToken) !== user.uid) {
        setErrorMessage(t("settings.deleteAccount.discordAccountMismatch"));
        return;
      }

      // Custom-token sign-in is the only Discord re-authentication Firebase
      // offers: the backend mints the token for the same uid, so this refreshes
      // the session (and its `auth_time`) without switching accounts.
      await auth().signInWithCustomToken(result.customToken);
      const reauthenticated = auth().currentUser;
      if (!reauthenticated || reauthenticated.uid !== user.uid) {
        setErrorMessage(t("settings.deleteAccount.discordAccountMismatch"));
        return;
      }

      await retryAfterReauth();
    } catch (error) {
      logger.error("Discord re-authentication failed:", error);
      setErrorMessage(t("settings.deleteAccount.discordFailed"));
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, retryAfterReauth, t]);

  const cancel = useCallback((): void => {
    if (isSubmitting) return;
    setVisible(false);
    setPassword("");
    setErrorMessage(null);
  }, [isSubmitting]);

  const confirmDeleteAccount = useCallback((): void => {
    Alert.alert(
      t("settings.deleteAccount.confirmTitle"),
      t("settings.deleteAccount.confirmMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("settings.deleteAccount.delete"),
          style: "destructive",
          onPress: () => void attemptDelete(),
        },
      ],
    );
  }, [attemptDelete, t]);

  return {
    confirmDeleteAccount,
    reauth: {
      visible,
      method,
      password,
      errorMessage,
      isSubmitting,
      showDiscordAlternative,
      onChangePassword: setPassword,
      onSubmitPassword: () => void submitPassword(),
      onVerifyWithGoogle: () => void verifyWithGoogle(),
      onVerifyWithDiscord: () => void verifyWithDiscord(),
      onCancel: cancel,
    },
  };
}
