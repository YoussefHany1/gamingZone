/**
 * MMKV persistence for PC specs.
 *
 * Two namespaces: the guest copy (never tied to an account) and one copy per
 * uid. The account copy lets a returning signed-in user see their specs before
 * Firestore answers, mirroring the rest of the app's warm-start behaviour.
 *
 * Values are validated on read — the catalog evolves, and a persisted id that
 * no longer exists must read as "not configured" rather than crash scoring.
 */
import type { PcSpecs } from "@gaming-zone/core";
import { isValidPcSpecs } from "@gaming-zone/utils";
import { storageDelete, storageGet, storageSet } from "@/src/lib/storage";

/** Entered before signing in; never written to Firestore as-is. */
export const GUEST_PC_SPECS_KEY = "@pc-specs:guest";

/** One copy per signed-in account. */
export function pcSpecsStorageKey(uid: string): string {
  return `@pc-specs:${uid}`;
}

function readValid(key: string): PcSpecs | null {
  const value = storageGet<unknown>(key);
  return isValidPcSpecs(value) ? value : null;
}

export function readGuestPcSpecs(): PcSpecs | null {
  return readValid(GUEST_PC_SPECS_KEY);
}

export function writeGuestPcSpecs(specs: PcSpecs): void {
  storageSet(GUEST_PC_SPECS_KEY, specs);
}

/** Removes the guest copy; call only after the account write succeeded. */
export function clearGuestPcSpecs(): void {
  storageDelete(GUEST_PC_SPECS_KEY);
}

export function readLocalPcSpecs(uid: string): PcSpecs | null {
  if (!uid) return null;
  return readValid(pcSpecsStorageKey(uid));
}

export function writeLocalPcSpecs(uid: string, specs: PcSpecs): void {
  if (!uid) return;
  storageSet(pcSpecsStorageKey(uid), specs);
}

export function clearLocalPcSpecs(uid: string): void {
  if (!uid) return;
  storageDelete(pcSpecsStorageKey(uid));
}
