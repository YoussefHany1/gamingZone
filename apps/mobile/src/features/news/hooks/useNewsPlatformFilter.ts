import { useCallback, useEffect, useState } from "react";
import { useUserPlatform } from "@/src/hooks/useUserPlatform";
import type { NewsPlatformFilter } from "../lib/articlePlatforms";

/**
 * How long to wait for the profile platform before assuming "All". The profile
 * read is a one-shot Firestore fetch that resolves quickly; this only guards
 * the pathological case (offline, hung request) where waiting would leave the
 * feed disabled and blank forever.
 */
const READY_FALLBACK_MS = 1_200;

export interface UseNewsPlatformFilterResult {
  /** Effective filter: the user's choice, else their profile platform, else all. */
  platform: NewsPlatformFilter;
  /** True once a filter decision has been made and the feed may load. */
  resolved: boolean;
  setPlatform: (value: NewsPlatformFilter) => void;
  /** Empty-state action: "show all platforms". */
  resetPlatform: () => void;
}

/**
 * Platform filter state for the News/Reviews tabs.
 *
 * Starts on the platform saved on the user's profile and falls back to `all`
 * when none is set. Until the profile read settles (or the safety timeout
 * fires) the caller should keep the feed disabled — otherwise the first query
 * would run with the wrong filter and refetch a moment later.
 */
export function useNewsPlatformFilter(): UseNewsPlatformFilterResult {
  const { platform: profilePlatform, loading } = useUserPlatform();
  const [selected, setSelected] = useState<NewsPlatformFilter | null>(null);
  const [resolved, setResolved] = useState<boolean>(!loading);

  useEffect(() => {
    if (!loading) {
      setResolved(true);
      return;
    }

    // Safety net: never let a stuck profile read hide the feed.
    const timer = setTimeout(() => setResolved(true), READY_FALLBACK_MS);
    return () => clearTimeout(timer);
  }, [loading]);

  const platform: NewsPlatformFilter = selected ?? profilePlatform ?? "all";

  const setPlatform = useCallback((value: NewsPlatformFilter) => {
    setSelected(value);
  }, []);

  const resetPlatform = useCallback(() => {
    setSelected("all");
  }, []);

  return { platform, resolved, setPlatform, resetPlatform };
}
