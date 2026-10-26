import { useEffect, useState } from "react";
import firestore from "@react-native-firebase/firestore";
import { ARTICLE_PLATFORMS } from "@gaming-zone/core";
import type { ArticlePlatform } from "@gaming-zone/core";
import { useAuthStore } from "../store/useAuthStore";
import { logger } from "@/src/lib/logger";

/**
 * Platforms the app currently supports as an account preference. Re-exported
 * from the shared core list so the profile picker, the news filter chips, and
 * the article classifier can never drift apart.
 */
export const USER_PLATFORMS = ARTICLE_PLATFORMS;

export type UserPlatform = ArticlePlatform;

export function isUserPlatform(value: unknown): value is UserPlatform {
  return (
    typeof value === "string" &&
    (USER_PLATFORMS as readonly string[]).includes(value.toLowerCase())
  );
}

/**
 * Reads the platform registered on the user's Firestore profile
 * (`users/{uid}.platform`). Returns `null` while loading, when the user is not
 * signed in, or when no platform has been set — so consumers can simply render
 * nothing in that case.
 *
 * @example
 * const { platform, loading } = useUserPlatform();
 * if (loading || !platform) return null;
 */
export function useUserPlatform(): { platform: UserPlatform | null; loading: boolean } {
  const uid = useAuthStore((s) => s.user?.uid ?? "");
  const [platform, setPlatform] = useState<UserPlatform | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(uid));

  useEffect(() => {
    if (!uid) {
      setPlatform(null);
      setLoading(false);
      return;
    }

    let mounted = true;
    setLoading(true);

    firestore()
      .collection("users")
      .doc(uid)
      .get()
      .then((doc) => {
        if (!mounted) return;
        const value = doc.data()?.platform;
        setPlatform(isUserPlatform(value) ? (value.toLowerCase() as UserPlatform) : null);
      })
      .catch((error) => {
        logger.error("[useUserPlatform] Error loading user platform:", error);
        if (mounted) setPlatform(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [uid]);

  return { platform, loading };
}
