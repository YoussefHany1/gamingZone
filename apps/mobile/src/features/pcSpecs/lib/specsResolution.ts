/**
 * Pure resolution rules for the user's PC specs.
 *
 * Three copies can exist:
 *  - `remote`       — the signed-in account's `users/{uid}.pcSpecs`;
 *  - `localAccount` — the last copy saved under that uid on this device;
 *  - `guest`        — specs entered before signing in.
 *
 * Account data always wins, a guest copy is adopted only when the account has
 * none, and a guest copy is never a reason to overwrite an account. The sync
 * hook performs the writes; this module only decides what should happen.
 */
import type { PcSpecs } from "@gaming-zone/core";
import { isValidPcSpecs } from "@gaming-zone/utils";

export type PcSpecsResolution = {
  /** The specs the UI should show right now. */
  specs: PcSpecs | null;
  source: "account" | "local" | "guest" | null;
  /** Specs that should be written to the account (migration/repair). */
  upload: PcSpecs | null;
  /** True when the guest copy can be deleted once the account is settled. */
  clearGuest: boolean;
};

export type PcSpecsResolutionInput = {
  isAnonymous: boolean;
  remote: unknown;
  localAccount: unknown;
  guest: unknown;
};

/** Newest of two valid specs, used when both are local copies. */
function newest(a: PcSpecs | null, b: PcSpecs | null): PcSpecs | null {
  if (!a) return b;
  if (!b) return a;
  return a.updatedAt >= b.updatedAt ? a : b;
}

export function resolvePcSpecsForUser({
  isAnonymous,
  remote,
  localAccount,
  guest,
}: PcSpecsResolutionInput): PcSpecsResolution {
  const remoteSpecs = isValidPcSpecs(remote) ? remote : null;
  const localSpecs = isValidPcSpecs(localAccount) ? localAccount : null;
  const guestSpecs = isValidPcSpecs(guest) ? guest : null;

  if (isAnonymous) {
    // Guest specs never touch another uid's local copy.
    return {
      specs: guestSpecs,
      source: guestSpecs ? "guest" : null,
      upload: null,
      clearGuest: false,
    };
  }

  if (remoteSpecs) {
    return {
      specs: remoteSpecs,
      source: "account",
      upload: null,
      // The account is authoritative; the pre-login copy has no further use.
      clearGuest: guestSpecs !== null,
    };
  }

  // The account has no specs: repair from the last local copy, otherwise adopt
  // the guest specs. In both cases the copy is pushed up by the caller.
  const fallback = newest(localSpecs, guestSpecs);
  if (fallback) {
    return {
      specs: fallback,
      source: localSpecs && fallback === localSpecs ? "local" : "guest",
      upload: fallback,
      clearGuest: false,
    };
  }

  return { specs: null, source: null, upload: null, clearGuest: guest !== null };
}
