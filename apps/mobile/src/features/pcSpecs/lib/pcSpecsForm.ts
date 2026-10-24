/**
 * Pure form logic for the PC specs screen.
 *
 * Kept out of the component so the clamping rules are unit-testable: a custom
 * RAM/storage value typed by the user must land inside the same bounds the
 * persisted-data validator (`isValidPcSpecs`) enforces, or the save would be
 * rejected after round-tripping through storage.
 */

/** Mirrors the bounds accepted by `isValidPcSpecs`. */
export const RAM_MIN_GB = 1;
export const RAM_MAX_GB = 1024;
export const STORAGE_MIN_GB = 0;
export const STORAGE_MAX_GB = 100_000;

/** Chip options shown by default; any other value goes through "Custom". */
export const RAM_OPTIONS = [4, 6, 8, 12, 16, 32, 48, 64] as const;
export const STORAGE_OPTIONS = [50, 100, 200, 250, 500, 1000, 2000] as const;

export type PcResolutionOption = "1080p" | "1440p" | "4k";

export const RESOLUTION_OPTIONS: readonly PcResolutionOption[] = ["1080p", "1440p", "4k"];

/**
 * Parses and clamps a typed-in GB value. Returns null when the text is not a
 * plain non-negative number; otherwise the value clamped to `[min, max]`.
 */
export function parseCustomGb(text: string, min: number, max: number): number | null {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return null;
  return Math.min(Math.max(value, min), max);
}

/**
 * True when the typed value, once clamped, would differ from the raw text —
 * i.e. the user typed something out of bounds or non-numeric, so the UI should
 * surface the range hint instead of silently rewriting the input.
 */
export function isCustomGbInvalid(text: string, min: number, max: number): boolean {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return true;
  const value = Number(trimmed);
  return value < min || value > max;
}

/**
 * True when the current value is not one of the chip options, so the
 * "Custom" chip must appear selected and pre-fill the input.
 */
export function isCustomValue(options: readonly number[], value: number): boolean {
  return !options.includes(value);
}
