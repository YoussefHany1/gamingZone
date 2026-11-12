import { useCallback, useMemo, useState } from "react";
import firestore from "@react-native-firebase/firestore";
import analytics from "@react-native-firebase/analytics";
import { storage } from "@/src/lib/storage";
import { useAuthStore } from "@/src/store/useAuthStore";
import { logger } from "@/src/lib/logger";
import {
  SETUP_FLAG_PREFIX,
  SETUP_MAX_GENRES,
  type SetupGenreId,
  type SetupPlatformId,
} from "../constants";

export type SetupStep = "platforms" | "genres";

export function setupFlagKey(uid: string): string {
  return `${SETUP_FLAG_PREFIX}${uid}`;
}

export function isSetupDone(uid: string): boolean {
  if (!uid) return false;
  return storage.getString(setupFlagKey(uid)) === "true";
}

export function markSetupDone(uid: string): void {
  if (!uid) return;
  storage.set(setupFlagKey(uid), "true");
}

export function useSetupFlow(onComplete: () => void) {
  const user = useAuthStore((s) => s.user);
  const [step, setStep] = useState<SetupStep>("platforms");
  const [platforms, setPlatforms] = useState<SetupPlatformId[]>([]);
  const [genres, setGenres] = useState<SetupGenreId[]>([]);
  const [saving, setSaving] = useState(false);

  const togglePlatform = useCallback((id: SetupPlatformId) => {
    setPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  }, []);

  const toggleGenre = useCallback((id: SetupGenreId) => {
    setGenres((prev) => {
      if (prev.includes(id)) return prev.filter((g) => g !== id);
      if (prev.length >= SETUP_MAX_GENRES) return prev;
      return [...prev, id];
    });
  }, []);

  const persist = useCallback(
    async (finalPlatforms: SetupPlatformId[], finalGenres: SetupGenreId[]) => {
      if (!user || user.isAnonymous) return;
      setSaving(true);
      try {
        await firestore()
          .collection("users")
          .doc(user.uid)
          .set(
            {
              preferredPlatforms: finalPlatforms,
              favoriteGenres: finalGenres,
              setupCompletedAt: firestore.FieldValue.serverTimestamp(),
            },
            { merge: true },
          );
      } catch (e) {
        logger.warn("[Setup] Failed to persist preferences", e);
      } finally {
        setSaving(false);
      }
    },
    [user],
  );

  const finish = useCallback(
    async (skip: boolean) => {
      if (!user || user.isAnonymous) {
        onComplete();
        return;
      }
      if (!skip) {
        await persist(platforms, genres);
      }
      markSetupDone(user.uid);
      try {
        await analytics().logEvent(skip ? "setup_skipped" : "setup_completed", {
          step,
          platforms_count: platforms.length,
          genres_count: genres.length,
        });
      } catch {
        // non-fatal
      }
      onComplete();
    },
    [user, persist, platforms, genres, step, onComplete],
  );

  const next = useCallback(async () => {
    if (step === "platforms") {
      try {
        await analytics().logEvent("setup_step_completed", { step: "platforms" });
      } catch {
        // ignore
      }
      setStep("genres");
      return;
    }
    await finish(false);
  }, [step, finish]);

  const skip = useCallback(async () => {
    await finish(true);
  }, [finish]);

  const canContinue = useMemo(() => {
    if (step === "platforms") return true; // platforms step is optional to select
    return genres.length >= 0; // genres optional too, but we encourage 3-5
  }, [step, genres.length]);

  return {
    step,
    platforms,
    genres,
    saving,
    canContinue,
    togglePlatform,
    toggleGenre,
    next,
    skip,
  };
}
