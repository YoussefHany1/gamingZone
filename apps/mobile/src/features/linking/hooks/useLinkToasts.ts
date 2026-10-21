/**
 * useLinkToasts — every user-facing message of the linking flows.
 *
 * The outcome → copy mapping lives in one place so Steam, PSN and Xbox stay
 * consistent and a new language only has to be translated once per message.
 */
import { useCallback } from "react";
import { ToastAndroid } from "react-native";
import { useTranslation } from "react-i18next";
import type {
  PsnSyncOutcome,
  SyncOutcome,
  XboxSyncOutcome,
} from "@/src/features/settings/lib/platformSync";

export type UseLinkToastsResult = {
  toastSteamOutcome: (outcome: SyncOutcome) => void;
  toastPsnOutcome: (outcome: PsnSyncOutcome) => void;
  toastXboxOutcome: (outcome: XboxSyncOutcome) => void;
  /** Maps a backend failure reason to a human-readable message. */
  xboxFailureMessage: (reason: string) => string;
};

export function useLinkToasts(): UseLinkToastsResult {
  const { t } = useTranslation();

  const toastSteamOutcome = useCallback(
    (outcome: SyncOutcome): void => {
      switch (outcome) {
        case "ok":
          ToastAndroid.show(
            t("settings.profile.linking.messages.synced") || "Library synced",
            ToastAndroid.SHORT,
          );
          break;
        case "private":
          ToastAndroid.show(
            t("settings.profile.steam.errors.privateProfile") ||
              "Your Steam profile is private",
            ToastAndroid.LONG,
          );
          break;
        case "empty":
          ToastAndroid.show(
            t("settings.profile.linking.messages.empty") || "No games found",
            ToastAndroid.SHORT,
          );
          break;
        default:
          ToastAndroid.show(
            t("settings.profile.linking.messages.syncFailed") || "Sync failed",
            ToastAndroid.SHORT,
          );
      }
    },
    [t],
  );

  const toastPsnOutcome = useCallback(
    (outcome: PsnSyncOutcome): void => {
      switch (outcome) {
        case "ok":
          ToastAndroid.show(
            t("settings.profile.linking.messages.synced") || "Library synced",
            ToastAndroid.SHORT,
          );
          break;
        case "empty":
          ToastAndroid.show(
            t("settings.profile.linking.psn.empty") || "No played games found",
            ToastAndroid.SHORT,
          );
          break;
        case "reauth_required":
          // The backend flipped the account to reauth_required — the banner in
          // this modal shows the reconnect prompt; never an error toast storm.
          ToastAndroid.show(
            t("settings.profile.linking.psn.reauthBannerFormal") ||
              "PlayStation session expired — reconnect to resume syncing",
            ToastAndroid.LONG,
          );
          break;
        default:
          ToastAndroid.show(
            t("settings.profile.linking.messages.syncFailed") || "Sync failed",
            ToastAndroid.SHORT,
          );
      }
    },
    [t],
  );

  const toastXboxOutcome = useCallback(
    (outcome: XboxSyncOutcome): void => {
      switch (outcome) {
        case "ok":
          ToastAndroid.show(
            t("settings.profile.linking.messages.synced") || "Library synced",
            ToastAndroid.SHORT,
          );
          break;
        case "empty":
          ToastAndroid.show(
            t("settings.profile.linking.xbox.empty") || "No games found",
            ToastAndroid.SHORT,
          );
          break;
        case "reauth_required":
          // The backend flipped the account to reauth_required — the banner in
          // this modal shows the reconnect prompt; never an error toast storm.
          ToastAndroid.show(
            t("settings.profile.linking.xbox.reauthBannerFormal") ||
              "Xbox session expired — reconnect to resume syncing",
            ToastAndroid.LONG,
          );
          break;
        default:
          ToastAndroid.show(
            t("settings.profile.linking.messages.syncFailed") || "Sync failed",
            ToastAndroid.SHORT,
          );
      }
    },
    [t],
  );

  const xboxFailureMessage = useCallback(
    (reason: string): string => {
      switch (reason) {
        case "not_configured":
          return (
            t("settings.profile.linking.xbox.notAvailable") ||
            "Xbox linking is not available right now"
          );
        case "no_xbox_profile":
          return (
            t("settings.profile.linking.xbox.noXboxProfile") ||
            "This Microsoft account has no Xbox profile yet"
          );
        case "child_account":
          return (
            t("settings.profile.linking.xbox.childAccount") ||
            "This account is a child account"
          );
        case "access_denied":
          return (
            t("settings.profile.linking.xbox.accessDenied") || "Sign-in was cancelled"
          );
        default:
          return (
            t("settings.profile.linking.xbox.errorFailed") || "Xbox sign-in failed"
          );
      }
    },
    [t],
  );

  return { toastSteamOutcome, toastPsnOutcome, toastXboxOutcome, xboxFailureMessage };
}
