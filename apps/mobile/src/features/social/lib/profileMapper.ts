/**
 * Firestore → `PublicProfile` mapping.
 *
 * The implementation lives in `@gaming-zone/core` so the web client and the
 * public `/u/[handle]` page read the document exactly the same way. This module
 * stays as the mobile import path (`./profileMapper`) used by the hooks and its
 * tests.
 */
export {
  mapLinks,
  mapPrivacy,
  mapPublicProfile,
  mapStatus,
  timestampToMillis,
} from "@gaming-zone/core";
