/**
 * ChoosePlatformPanel — the entry screen of the linked-account modal.
 *
 * Lists Steam, PlayStation and Xbox. Pressing a row runs the full pipeline for
 * that platform: not linked or reconnect-required → sign-in flow → link →
 * auto-sync; connected → sync now.
 */
import React, { memo } from "react";
import { TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import PlatformRow from "@/src/features/linking/components/PlatformRow";
import { useLinkPanelStyles } from "@/src/features/linking/components/useLinkPanelStyles";
import { formatSyncDate } from "@/src/features/linking/lib/formatSyncDate";
import type {
  LinkedAccount,
  LinkedAccountPlatform,
} from "@/src/features/settings/types";

/**
 * The reconnect hint per platform. Steam reuses the PlayStation copy because
 * there is no `linking.steam.reauthBanner` key — both read "Session expired -
 * tap to reconnect".
 */
const REAUTH_BANNER_KEY: Record<LinkedAccountPlatform, string> = {
  steam: "settings.profile.linking.psn.reauthBanner",
  psn: "settings.profile.linking.psn.reauthBanner",
  xbox: "settings.profile.linking.xbox.reauthBanner",
};

export type ChoosePlatformPanelProps = {
  steamAccount: LinkedAccount | null;
  psnAccount: LinkedAccount | null;
  xboxAccount: LinkedAccount | null;
  busy: boolean;
  onSteamPress: () => void;
  onPsnPress: () => void;
  onXboxPress: () => void;
  onSteamRelink: () => void;
  onPsnRelink: () => void;
  onXboxRelink: () => void;
  onUnlink: (platform: LinkedAccountPlatform) => void;
  onManualEntry: () => void;
};

function ChoosePlatformPanel({
  steamAccount,
  psnAccount,
  xboxAccount,
  busy,
  onSteamPress,
  onPsnPress,
  onXboxPress,
  onSteamRelink,
  onPsnRelink,
  onXboxRelink,
  onUnlink,
  onManualEntry,
}: ChoosePlatformPanelProps): React.ReactElement {
  const { t } = useTranslation();
  const styles = useLinkPanelStyles();

  const metaFor = (
    account: LinkedAccount | null,
    platform: LinkedAccountPlatform,
  ): string => {
    if (!account) {
      return t("settings.profile.linking.messages.notLinked") || "Not connected";
    }
    if (account.status === "reauth_required") {
      return t(REAUTH_BANNER_KEY[platform]) || "Session expired - tap to reconnect";
    }
    return `${t("settings.profile.linking.messages.lastSynced")}: ${formatSyncDate(account.lastSyncedAt)}`;
  };

  const steamMeta = metaFor(steamAccount, "steam");
  const psnMeta = metaFor(psnAccount, "psn");
  const xboxMeta = metaFor(xboxAccount, "xbox");

  return (
    <>
      <CustomText style={styles.title}>
        {t("settings.profile.linking.title") || "Sync Your Game Library"}
      </CustomText>
      <CustomText style={styles.description}>
        {t("settings.profile.linking.description") ||
          "Link your accounts to automatically import your games into your lists."}
      </CustomText>

      <PlatformRow
        platform="steam"
        name="Steam"
        meta={steamMeta}
        busy={busy}
        onPress={onSteamPress}
        // Re-authenticate without disconnecting (fresh OpenID session).
        onRelink={steamAccount ? onSteamRelink : undefined}
        onUnlink={steamAccount ? () => onUnlink("steam") : undefined}
      />

      <PlatformRow
        platform="psn"
        name={psnAccount?.onlineId || "PlayStation Network"}
        meta={psnMeta}
        busy={busy}
        onPress={onPsnPress}
        onRelink={psnAccount ? onPsnRelink : undefined}
        onUnlink={psnAccount ? () => onUnlink("psn") : undefined}
      />

      <PlatformRow
        platform="xbox"
        name={xboxAccount?.gamertag || "Xbox"}
        meta={xboxMeta}
        busy={busy}
        onPress={onXboxPress}
        // Re-authenticate without disconnecting (fresh Microsoft session).
        onRelink={xboxAccount ? onXboxRelink : undefined}
        onUnlink={xboxAccount ? () => onUnlink("xbox") : undefined}
      />

      {/* NPSSO fallback kept reachable, but out of the main flow. */}
      <TouchableOpacity
        onPress={onManualEntry}
        disabled={busy}
        style={styles.manualLink}
      >
        <CustomText style={styles.manualLinkText}>
          {t("settings.profile.linking.psn.manualEntry") ||
            "Paste a PlayStation NPSSO token manually"}
        </CustomText>
      </TouchableOpacity>
    </>
  );
}

ChoosePlatformPanel.displayName = "ChoosePlatformPanel";

export default memo(ChoosePlatformPanel);
