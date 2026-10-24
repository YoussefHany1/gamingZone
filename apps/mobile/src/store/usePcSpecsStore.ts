/**
 * The app-wide source of truth for the user's PC specs.
 *
 * Guests are persisted to MMKV only. Signed-in users get an optimistic local
 * copy (warm start) plus a Firestore write; the sync hook reconciles both and
 * migrates guest specs exactly once.
 */
import { create } from "zustand";
import type { PcSpecs } from "@gaming-zone/core";
import { useAuthStore } from "./useAuthStore";
import {
  clearGuestPcSpecs,
  clearLocalPcSpecs,
  readGuestPcSpecs,
  readLocalPcSpecs,
  writeGuestPcSpecs,
  writeLocalPcSpecs,
} from "@/src/features/pcSpecs/lib/specsStorage";
import {
  clearPcSpecsFromAccount,
  savePcSpecsToAccount,
} from "@/src/services/pcSpecsService";

/** The editable fields; the store stamps `updatedAt` and defaults the resolution. */
export type PcSpecsInput = Pick<
  PcSpecs,
  "cpuId" | "gpuId" | "ramGb" | "freeStorageGb" | "resolution"
>;

interface PcSpecsState {
  specs: PcSpecs | null;
  /** True once the local copy for the current auth state has been read. */
  hydrated: boolean;
  saving: boolean;

  /** Reads the guest/account-local copy for the current auth state. */
  hydrate: () => void;
  /** Pushes account data (from Firestore) into the store and local cache. */
  applyAccountSpecs: (uid: string, specs: PcSpecs | null) => void;
  /** Saves locally and, for signed-in users, to Firestore. */
  save: (input: PcSpecsInput) => Promise<PcSpecs>;
  /** Resets to "not configured" locally and, for signed-in users, on the account. */
  clear: () => Promise<void>;
  /** Drops the guest copy without touching any account. */
  discardGuestCopy: () => void;
}

export const usePcSpecsStore = create<PcSpecsState>()((set, get) => ({
  specs: null,
  hydrated: false,
  saving: false,

  hydrate: () => {
    const user = useAuthStore.getState().user;
    const specs =
      user && !user.isAnonymous ? readLocalPcSpecs(user.uid) : readGuestPcSpecs();
    set({ specs, hydrated: true });
  },

  applyAccountSpecs: (uid, specs) => {
    if (!uid) return;
    if (specs) writeLocalPcSpecs(uid, specs);
    // Account data is authoritative once the snapshot has resolved; a null
    // simply means this account has no specs yet.
    set({ specs, hydrated: true });
  },

  save: async (input) => {
    const next: PcSpecs = {
      resolution: "1080p",
      ...input,
      updatedAt: Date.now(),
    };
    const user = useAuthStore.getState().user;

    set({ saving: true });

    // Guest: local only, by design.
    if (!user || user.isAnonymous) {
      writeGuestPcSpecs(next);
      set({ specs: next, hydrated: true, saving: false });
      return next;
    }

    // Signed in: persist locally first so the UI survives a crash or a
    // transient Firestore failure, then push to the account.
    writeLocalPcSpecs(user.uid, next);
    set({ specs: next, hydrated: true });

    try {
      await savePcSpecsToAccount(user.uid, next);
      // The guest copy has been adopted by the account; it must not be
      // re-adopted later by a different account.
      clearGuestPcSpecs();
      set({ saving: false });
      return next;
    } catch (error) {
      set({ saving: false });
      throw error;
    }
  },

  clear: async () => {
    const user = useAuthStore.getState().user;
    set({ saving: true });

    // Guest: local only, by design.
    if (!user || user.isAnonymous) {
      clearGuestPcSpecs();
      set({ specs: null, hydrated: true, saving: false });
      return;
    }

    // Drop the local copy first so the UI survives a transient Firestore
    // failure; the snapshot reconciliation keeps showing "not configured".
    clearLocalPcSpecs(user.uid);
    set({ specs: null, hydrated: true });

    try {
      await clearPcSpecsFromAccount(user.uid);
      clearGuestPcSpecs();
      set({ saving: false });
    } catch (error) {
      set({ saving: false });
      throw error;
    }
  },

  discardGuestCopy: () => {
    clearGuestPcSpecs();
  },
}));

/** Non-React read for scoring code. */
export function getPcSpecs(): PcSpecs | null {
  return usePcSpecsStore.getState().specs;
}
