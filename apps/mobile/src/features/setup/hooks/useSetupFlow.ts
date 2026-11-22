import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import firestore from "@react-native-firebase/firestore";
import analytics from "@react-native-firebase/analytics";
import { storage } from "@/src/lib/storage";
import { useAuthStore } from "@/src/store/useAuthStore";
import { logger } from "@/src/lib/logger";
import {
  SETUP_FLAG_PREFIX,
  SETUP_GENRES,
  SETUP_MAX_GENRES,
  SETUP_PLATFORMS,
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

/** Keep only IDs the current wizard still knows about. */
function storedIds<T extends string>(value: unknown, allowed: readonly T[]): T[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is T => typeof item === "string" && allowed.includes(item as T));
}

export function useSetupFlow(onComplete: () => void) {
  const user = useAuthStore((s) => s.user);
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState<SetupStep>("platforms");
  const [platforms, setPlatforms] = useState<SetupPlatformId[]>([]);
  const [genres, setGenres] = useState<SetupGenreId[]>([]);
  const [saving, setSaving] = useState(false);
  // Remember which steps were already answered by saved Firestore data so they
  // stay skipped when the user navigates back/forward inside this wizard.
  const [hadPlatforms, setHadPlatforms] = useState(false);
  const [hadGenres, setHadGenres] = useState(false);
  const hydratedUidRef = useRef<string | null>(null);

  // Hydrate from Firestore so a returning user is not asked for choices they
  // already made on another device/install. When both lists are populated the
  // wizard has nothing left to do and completes immediately.
  useEffect(() => {
    const uid = user?.uid;
    if (!uid || user.isAnonymous) {
      hydratedUidRef.current = null;
      setPlatforms([]);
      setGenres([]);
      setHadPlatforms(false);
      setHadGenres(false);
      setStep("platforms");
      setReady(true);
      return;
    }
    if (hydratedUidRef.current === uid) return;
    hydratedUidRef.current = uid;

    let cancelled = false;
    setReady(false);

    void (async () => {
      try {
        const snapshot = await firestore().collection("users").doc(uid).get();
        const data = snapshot.data() as
          | { preferredPlatforms?: unknown; favoriteGenres?: unknown }
          | undefined;

        const savedPlatforms = storedIds<SetupPlatformId>(
          data?.preferredPlatforms,
          SETUP_PLATFORMS.map((p) => p.id),
        );
        const savedGenres = storedIds<SetupGenreId>(
          data?.favoriteGenres,
          SETUP_GENRES.map((g) => g.id),
        );

        if (cancelled) return;

        setPlatforms(savedPlatforms);
        setGenres(savedGenres);
        setHadPlatforms(savedPlatforms.length > 0);
        setHadGenres(savedGenres.length > 0);

        if (savedPlatforms.length > 0 && savedGenres.length > 0) {
          markSetupDone(uid);
          onComplete();
          return;
        }

        // A saved platform means the platform screen is already answered;
        // likewise a saved genre would skip the genre screen when reached.
        setStep(savedPlatforms.length > 0 ? "genres" : "platforms");
      } catch (e) {
        logger.warn("[Setup] Failed to load saved preferences", e);
        if (!cancelled) setStep("platforms");
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, onComplete]);

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

  const back = useCallback(() => {
    // Do not navigate back into a step whose answer came from saved data.
    if (step === "genres" && !hadPlatforms) setStep("platforms");
  }, [step, hadPlatforms]);

  const next = useCallback(async () => {
    if (step === "platforms") {
      try {
        await analytics().logEvent("setup_step_completed", { step: "platforms" });
      } catch {
        // ignore
      }
      // Genres were already chosen, so finish instead of re-asking them.
      if (hadGenres) {
        await finish(false);
        return;
      }
      setStep("genres");
      return;
    }
    await finish(false);
  }, [step, finish, hadGenres]);

  const skip = useCallback(async () => {
    await finish(true);
  }, [finish]);

  const canContinue = useMemo(() => {
    if (step === "platforms") return true; // platforms step is optional to select
    return genres.length >= 0; // genres optional too, but we encourage 3-5
  }, [step, genres.length]);

  return {
    ready,
    step,
    platforms,
    genres,
    saving,
    canContinue,
    togglePlatform,
    toggleGenre,
    back,
    next,
    skip,
  };
}
