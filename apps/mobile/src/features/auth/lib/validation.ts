/**
 * Pure auth field validators.
 *
 * Deliberately framework-free (no React, no i18n) so the rules are testable
 * and reusable. Hooks translate the returned error keys via `useAuthValidation`
 * and components render the messages inline.
 *
 * Error keys map onto the existing `auth.errors.*` locale entries:
 *   emailRequired / emailInvalid / nameShort / passwordShort /
 *   passwordLetter / passwordNumber
 */

/** Minimum password length enforced by Firebase + the register checklist. */
export const MIN_PASSWORD_LENGTH = 8;

/** Per-rule pass/fail state for the register password checklist. */
export type PasswordChecks = {
  /** At least `MIN_PASSWORD_LENGTH` characters. */
  minLength: boolean;
  /** Contains at least one lowercase letter. */
  hasLetter: boolean;
  /** Contains at least one digit. */
  hasNumber: boolean;
};

export function getPasswordChecks(password: string): PasswordChecks {
  return {
    minLength: password.length >= MIN_PASSWORD_LENGTH,
    hasLetter: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
  };
}

/** True when every `PasswordChecks` rule passes. */
export function isPasswordValid(password: string): boolean {
  const checks = getPasswordChecks(password);
  return checks.minLength && checks.hasLetter && checks.hasNumber;
}

/** Number of rules passed (0–3) — drives the strength meter bar. */
export function getStrengthScore(password: string): number {
  const checks = getPasswordChecks(password);
  return [checks.minLength, checks.hasLetter, checks.hasNumber].filter(
    Boolean,
  ).length;
}

/**
 * Email fields are frequently filled by copy/paste, which can leave leading
 * or trailing whitespace. Normalise at every entry/submit point so the value
 * sent to Firebase always matches what the user sees.
 */
export function normalizeEmail(email: string): string {
  return email.trim();
}

/** RFC-5322-lite: local@domain.tld. Rejects spaces and double dots. */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizeEmail(email));
}

/**
 * Validates an email field. Returns a locale key, or `null` when valid.
 * Empty → `emailRequired`, malformed → `emailInvalid`.
 */
export function emailErrorKey(email: string): string | null {
  if (!normalizeEmail(email)) return "auth.errors.emailRequired";
  if (!isValidEmail(email)) return "auth.errors.emailInvalid";
  return null;
}

/** Validates the display-name field. Requires at least 2 characters. */
export function nameErrorKey(name: string): string | null {
  if (name.trim().length < 2) return "auth.errors.nameShort";
  return null;
}

/** Validates the password field, reporting the first failed rule. */
export function passwordErrorKey(password: string): string | null {
  const checks = getPasswordChecks(password);
  if (!checks.minLength) return "auth.errors.passwordShort";
  if (!checks.hasLetter) return "auth.errors.passwordLetter";
  if (!checks.hasNumber) return "auth.errors.passwordNumber";
  return null;
}
