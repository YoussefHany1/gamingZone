/**
 * storage.ts — MMKV-backed synchronous key-value store.
 *
 * All cache reads are now *synchronous* (no async/await overhead), which
 * eliminates the multiple await ticks that AsyncStorage caused on the JS
 * thread for every useCachedData call.
 *
 * The API intentionally mirrors the parts of AsyncStorage that useCachedData
 * used, making the migration a near-drop-in replacement.
 */
import { createMMKV, type MMKV } from "react-native-mmkv";

// A single app-wide MMKV instance.
// MMKV stores data in a memory-mapped file — reads are as fast as reading
// from RAM, and writes are flushed to disk asynchronously by the OS.
const mmkv = createMMKV({ id: "gamingzone-cache" });

// ---------------------------------------------------------------------------
// Secret-guard
// ---------------------------------------------------------------------------
// MMKV is an *unencrypted, un-garbage-collected* memory-mapped file: anything
// written here survives on disk and is readable by anyone with the app's data
// directory (rooted device, debuggable build, cloud backup). Secrets must
// never be stored here — Firebase sessions live in the native Firebase SDK's
// own secure storage, FCM tokens live in Firestore, and NPSSO/Discord tokens
// are exchanged server-side and never touch the client.
//
// Enforcement is two-layered:
//  1. Runtime (here): dev builds throw on a secret-like key before the write
//     reaches disk. Release builds skip the check (zero cost).
//  2. ESLint (`.eslintrc.json` → no-restricted-syntax): statically flags
//     string-literal secret keys passed to `storage.set` / `storageSet*`.
//
// Kept deliberately permissive of generic words like "key" — cache keys such
// as `GAMIFICATION_${uid}` legitimately contain "KEY" — while matching the
// credential vocabulary used across the codebase.
const SECRET_KEY_PATTERN =
  /token|secret|password|passwd|credential|api_?key|private_?key|npsso|ssocookie|authtoken|refresh_|jwt|bearer|fcm/i;

function assertNotSecretKey(key: string): void {
  if (__DEV__ && SECRET_KEY_PATTERN.test(key)) {
    throw new Error(
      `[storage] Refusing to write "${key}" to MMKV — key looks like a secret. ` +
        "MMKV is an unencrypted on-disk store; auth tokens must stay in the " +
        "Firebase SDK's session storage, and other credentials must go to " +
        "the backend (see docs in src/lib/storage.ts).",
    );
  }
}

/**
 * Guarded view of the MMKV instance.
 *
 * The native instance itself is never exported: every write funnels through
 * `set` (the assertion), so a caller cannot bypass the secret-guard by
 * importing `storage` directly. Reads and deletes are not guarded — they can
 * never persist new data.
 *
 * If a new MMKV method is needed, add it here (and to the Pick type) rather
 * than exporting `mmkv` itself.
 */
export const storage: Pick<MMKV, "getString" | "set" | "remove"> = {
  getString: (key) => mmkv.getString(key),
  set(key, value) {
    assertNotSecretKey(key);
    mmkv.set(key, value);
  },
  remove: (key) => mmkv.remove(key),
};

// ---------------------------------------------------------------------------
// Typed helpers used by useCachedData
// ---------------------------------------------------------------------------

/** Read and JSON-parse a stored value. Returns null if absent. */
export function storageGet<T>(key: string): T | null {
  const raw = storage.getString(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** JSON-serialize and store a value. */
export function storageSet(key: string, value: unknown): void {
  assertNotSecretKey(key);
  storage.set(key, JSON.stringify(value));
}

/** Read a stored timestamp (milliseconds). Returns null if absent. */
export function storageGetTimestamp(key: string): number | null {
  const raw = storage.getString(key);
  return raw ? parseInt(raw, 10) : null;
}

/** Store a timestamp (milliseconds). */
export function storageSetTimestamp(key: string, ts: number): void {
  assertNotSecretKey(key);
  storage.set(key, String(ts));
}

/** Delete a key (and its timestamp companion). */
export function storageDelete(key: string): void {
  storage.remove(key);
  storage.remove(`${key}_timestamp`);
}
