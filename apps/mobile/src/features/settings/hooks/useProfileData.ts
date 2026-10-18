import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import firestore from "@react-native-firebase/firestore";
import { useAuthStore } from "@/src/store/useAuthStore";
import { logger } from "@/src/lib/logger";

export type ProfileData = {
  displayName: string;
  photoURL: string;
  /** Pre-formatted "joined" date, or null when the account has no creation time. */
  memberSince: string | null;
  platform: string;
  country: string;
};

/**
 * Everything the profile header renders.
 *
 * The auth profile carries the name and photo; `platform` and `country` only
 * live on the Firestore user document, so they are fetched separately and the
 * header paints with them empty until they arrive.
 */
export function useProfileData(): ProfileData {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const uid = user?.uid ?? "";

  const [details, setDetails] = useState<{ platform: string; country: string }>({
    platform: "",
    country: "",
  });

  useEffect(() => {
    if (!uid) return;

    let isMounted = true;

    firestore()
      .collection("users")
      .doc(uid)
      .get()
      .then((doc) => {
        if (!isMounted) return;
        const data = doc.data();
        setDetails({
          platform: typeof data?.platform === "string" ? data.platform : "",
          country: typeof data?.country === "string" ? data.country : "",
        });
      })
      .catch((error) => {
        logger.error("[useProfileData] Error loading user doc:", error);
      });

    return () => {
      isMounted = false;
    };
  }, [uid]);

  const memberSince = useMemo(() => {
    const created = user?.metadata?.creationTime;
    if (!created) return null;

    try {
      return new Date(created).toLocaleDateString(i18n.language, {
        month: "long",
        year: "numeric",
      });
    } catch {
      return null;
    }
  }, [user?.metadata?.creationTime, i18n.language]);

  return {
    displayName: user?.displayName || t("auth.register.signUpButton"),
    photoURL: user?.photoURL || "",
    memberSince,
    platform: details.platform,
    country: details.country,
  };
}
