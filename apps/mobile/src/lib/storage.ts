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
import { createMMKV } from "react-native-mmkv";

// A single app-wide MMKV instance.
// MMKV stores data in a memory-mapped file — reads are as fast as reading
// from RAM, and writes are flushed to disk asynchronously by the OS.
export const storage = createMMKV({ id: "gamingzone-cache" });

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
  storage.set(key, JSON.stringify(value));
}

/** Read a stored timestamp (milliseconds). Returns null if absent. */
export function storageGetTimestamp(key: string): number | null {
  const raw = storage.getString(key);
  return raw ? parseInt(raw, 10) : null;
}

/** Store a timestamp (milliseconds). */
export function storageSetTimestamp(key: string, ts: number): void {
  storage.set(key, String(ts));
}

/** Delete a key (and its timestamp companion). */
export function storageDelete(key: string): void {
  storage.delete(key);
  storage.delete(`${key}_timestamp`);
}
