import { useCallback, useEffect, useRef, useState } from "react";
import {
  createDefaultPrivacy,
  validateHandle,
  type ProfilePrivacy,
} from "@gaming-zone/core";
import { logger } from "@/src/lib/logger";
import { claimHandle, updateMyPublicProfile } from "../lib/profileService";
import { isHandleTakenError } from "../lib/handles";
import { useMyProfile } from "./useMyProfile";

/** Handle errors surfaced to the editor, including the client-only "taken". */
export type HandleSubmitError =
  | "empty"
  | "length"
  | "charset"
  | "reserved"
  | "taken"
  | "failed";

export type PublicProfileDraft = {
  handle: string;
  bannerURL: string | null;
  bio: string;
  statusEmoji: string;
  statusText: string;
  privacy: ProfilePrivacy;
};

export type UsePublicProfileEditorResult = {
  draft: PublicProfileDraft;
  /** False until the profile document exists; the section is hidden meanwhile. */
  available: boolean;
  loading: boolean;
  saving: boolean;
  claiming: boolean;
  handleError: HandleSubmitError | null;
  setHandle: (value: string) => void;
  setBannerURL: (value: string | null) => void;
  setBio: (value: string) => void;
  setStatusEmoji: (value: string) => void;
  setStatusText: (value: string) => void;
  setPrivacy: (patch: Partial<ProfilePrivacy>) => void;
  claimDraftHandle: () => Promise<void>;
  save: () => Promise<boolean>;
};

const EMPTY_DRAFT: PublicProfileDraft = {
  handle: "",
  bannerURL: null,
  bio: "",
  statusEmoji: "",
  statusText: "",
  privacy: createDefaultPrivacy(),
};

/**
 * Draft + mutations for the public-profile section of the edit screen.
 *
 * The draft is seeded once per profile document. Re-seeding on every snapshot
 * would overwrite what the user is typing whenever the profile changes on
 * another device (or when the link-projection trigger writes).
 */
export function usePublicProfileEditor(uid: string): UsePublicProfileEditorResult {
  const { profile, loading } = useMyProfile(uid);
  const [draft, setDraft] = useState<PublicProfileDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState<boolean>(false);
  const [claiming, setClaiming] = useState<boolean>(false);
  const [handleError, setHandleError] = useState<HandleSubmitError | null>(null);
  const seededFor = useRef<string | null>(null);

  useEffect(() => {
    if (!profile || seededFor.current === profile.uid) return;

    seededFor.current = profile.uid;
    setDraft({
      handle: profile.handle,
      bannerURL: profile.bannerURL,
      bio: profile.bio,
      statusEmoji: profile.status?.emoji ?? "",
      statusText: profile.status?.text ?? "",
      privacy: profile.privacy,
    });
  }, [profile]);

  const setHandle = useCallback((value: string): void => {
    setHandleError(null);
    setDraft((current) => ({ ...current, handle: value }));
  }, []);

  const setBannerURL = useCallback((value: string | null): void => {
    setDraft((current) => ({ ...current, bannerURL: value }));
  }, []);

  const setBio = useCallback((value: string): void => {
    setDraft((current) => ({ ...current, bio: value }));
  }, []);

  const setStatusEmoji = useCallback((value: string): void => {
    setDraft((current) => ({ ...current, statusEmoji: value }));
  }, []);

  const setStatusText = useCallback((value: string): void => {
    setDraft((current) => ({ ...current, statusText: value }));
  }, []);

  const setPrivacy = useCallback((patch: Partial<ProfilePrivacy>): void => {
    setDraft((current) => ({
      ...current,
      privacy: { ...current.privacy, ...patch },
    }));
  }, []);

  const claimDraftHandle = useCallback(async (): Promise<void> => {
    const validation = validateHandle(draft.handle);
    if (!validation.ok) {
      setHandleError(validation.reason);
      return;
    }

    setClaiming(true);
    setHandleError(null);
    try {
      const claimed = await claimHandle(validation.handle);
      setDraft((current) => ({ ...current, handle: claimed }));
    } catch (error) {
      setHandleError(isHandleTakenError(error) ? "taken" : "failed");
    } finally {
      setClaiming(false);
    }
  }, [draft.handle]);

  const save = useCallback(async (): Promise<boolean> => {
    if (!profile) return false;

    setSaving(true);
    try {
      const statusText = draft.statusText.trim();
      await updateMyPublicProfile(uid, {
        bannerURL: draft.bannerURL,
        bio: draft.bio,
        status: statusText
          ? { text: statusText, emoji: draft.statusEmoji.trim() }
          : null,
        privacy: draft.privacy,
      });
      return true;
    } catch (error) {
      logger.error("[usePublicProfileEditor] save failed:", error);
      return false;
    } finally {
      setSaving(false);
    }
  }, [draft, profile, uid]);

  return {
    draft,
    available: profile !== null,
    loading,
    saving,
    claiming,
    handleError,
    setHandle,
    setBannerURL,
    setBio,
    setStatusEmoji,
    setStatusText,
    setPrivacy,
    claimDraftHandle,
    save,
  };
}
