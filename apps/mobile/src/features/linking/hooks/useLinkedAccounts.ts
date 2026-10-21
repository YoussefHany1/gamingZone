/**
 * useLinkedAccounts — the live view of the user's linked game accounts.
 *
 * One Firestore listener per platform feeds the "choose" panel, and the same
 * hook owns the two account mutations the modal performs (waiting for the
 * backend-written doc and disconnecting an account).
 */
import { useCallback, useEffect, useState } from "react";
import { ToastAndroid } from "react-native";
import { useTranslation } from "react-i18next";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import { unlinkAccount } from "@/src/features/settings/lib/platformSync";
import type { LinkedAccount, LinkedAccountPlatform } from "@/src/features/settings/types";
import { logger } from "@/src/lib/logger";

export type UseLinkedAccountsResult = {
  steamAccount: LinkedAccount | null;
  psnAccount: LinkedAccount | null;
  xboxAccount: LinkedAccount | null;
  /** Resolves once the backend-written doc shows up (or the timeout elapses). */
  waitForMounted: (
    platform: LinkedAccountPlatform,
    timeoutMs?: number,
  ) => Promise<boolean>;
  /** Disconnects a platform and clears its row optimistically. */
  unlink: (platform: LinkedAccountPlatform) => Promise<void>;
};

/** The platforms the user can link, in the order they are rendered. */
const PLATFORMS = ["steam", "psn", "xbox"] as const;

export function useLinkedAccounts(visible: boolean): UseLinkedAccountsResult {
  const { t } = useTranslation();
  const [steamAccount, setSteamAccount] = useState<LinkedAccount | null>(null);
  const [psnAccount, setPsnAccount] = useState<LinkedAccount | null>(null);
  const [xboxAccount, setXboxAccount] = useState<LinkedAccount | null>(null);

  // ── Live linkedAccounts subscription while the modal is open ───────────────
  useEffect(() => {
    if (!visible) return;
    const uid = auth().currentUser?.uid;
    if (!uid) return;

    const subs: Array<() => void> = [];
    for (const platform of PLATFORMS) {
      const sub = firestore()
        .collection("users")
        .doc(uid)
        .collection("linkedAccounts")
        .doc(platform)
        .onSnapshot(
          (snap) => {
            const data = (snap.data() ?? null) as LinkedAccount | null;
            // A doc keeps its identifiers after unlinking (status: "unlinked")
            // — it must render as "not connected" from the user's view.
            const connected = data != null && data.status !== "unlinked";
            if (platform === "steam") {
              setSteamAccount(connected && data?.steamId ? data : null);
            } else if (platform === "psn") {
              setPsnAccount(connected && data?.onlineId ? data : null);
            } else {
              setXboxAccount(connected && data?.xuid ? data : null);
            }
          },
          (error) => {
            // e.g. rules not deployed yet — degrade to "not connected".
            logger.warn("[useLinkedAccounts] linkedAccounts listener error:", error);
          },
        );
      subs.push(sub);
    }
    return () => subs.forEach((fn) => fn());
  }, [visible]);

  /**
   * Waits for the backend-written doc so the UI reflects it. Never throws:
   * a Firestore hiccup must not abort the sign-in flow — the caller falls
   * back to the Steam ID carried by the callback URL.
   */
  const waitForMounted = useCallback(
    async (platform: LinkedAccountPlatform, timeoutMs = 15_000): Promise<boolean> => {
      const uid = auth().currentUser?.uid;
      if (!uid) return false;
      const deadline = Date.now() + timeoutMs;
      const ref = firestore()
        .collection("users")
        .doc(uid)
        .collection("linkedAccounts")
        .doc(platform);
      while (Date.now() < deadline) {
        try {
          const snap = await ref.get();
          // RNFB exposes exists() as a method (see other services).
          if (snap.exists()) return true;
        } catch (e) {
          logger.warn(`[useLinkedAccounts] linkedAccounts/${platform} read failed:`, e);
          return false;
        }
        await new Promise((r) => setTimeout(r, 1500));
      }
      return false;
    },
    [],
  );

  const unlink = useCallback(
    async (platform: LinkedAccountPlatform): Promise<void> => {
      // Optimistic: flip the row to "not connected" immediately — the
      // snapshot listener may take a round-trip, and the next snapshot event
      // (carrying status "unlinked") maps back to the same cleared state.
      if (platform === "steam") setSteamAccount(null);
      else if (platform === "psn") setPsnAccount(null);
      else setXboxAccount(null);
      await unlinkAccount(platform);
      ToastAndroid.show(
        t("settings.profile.linking.messages.unlinked") || "Disconnected",
        ToastAndroid.SHORT,
      );
    },
    [t],
  );

  return { steamAccount, psnAccount, xboxAccount, waitForMounted, unlink };
}
