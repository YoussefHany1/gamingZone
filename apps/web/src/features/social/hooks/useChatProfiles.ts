import { useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface ChatSenderProfile {
  displayName: string;
  photoURL: string | null;
}

/**
 * Profiles are readable only one document at a time (`list` is denied by the
 * rules), so chat resolves avatars per unique sender instead of querying the
 * collection. Results are cached for the session to avoid re-reading the same
 * profile on every realtime message update.
 */
const profileCache = new Map<string, ChatSenderProfile>();

export function useChatProfiles(uids: string[]): Record<string, ChatSenderProfile> {
  const key = useMemo(
    () => Array.from(new Set(uids.filter(Boolean))).sort().join("|"),
    [uids],
  );
  const [fetched, setFetched] = useState<Record<string, ChatSenderProfile>>({});

  const cached = useMemo(() => {
    const result: Record<string, ChatSenderProfile> = {};
    for (const id of key ? key.split("|") : []) {
      const profile = profileCache.get(id);
      if (profile) result[id] = profile;
    }
    return result;
  }, [key]);

  useEffect(() => {
    if (!key) return;
    const missing = key.split("|").filter((id) => !profileCache.has(id));
    if (missing.length === 0) return;

    let cancelled = false;
    void Promise.all(
      missing.map(async (id) => {
        try {
          const snapshot = await getDoc(doc(db, "profiles", id));
          const data = snapshot.data() ?? {};
          const profile: ChatSenderProfile = {
            displayName:
              typeof data.displayName === "string" ? data.displayName : "Player",
            photoURL: typeof data.photoURL === "string" ? data.photoURL : null,
          };
          profileCache.set(id, profile);
          return [id, profile] as const;
        } catch {
          return null;
        }
      }),
    ).then((entries) => {
      if (cancelled) return;
      setFetched((current) => {
        const next = { ...current };
        for (const entry of entries) {
          if (entry) next[entry[0]] = entry[1];
        }
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [key]);

  return useMemo(() => ({ ...fetched, ...cached }), [fetched, cached]);
}
