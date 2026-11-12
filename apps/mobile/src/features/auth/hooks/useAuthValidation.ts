import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  emailErrorKey,
  nameErrorKey,
  passwordErrorKey,
} from "../lib/validation";

export type AuthValidators = {
  /** `null` when valid, otherwise a localised message. */
  validateEmail: (email: string) => string | null;
  /** `null` when valid, otherwise a localised message. */
  validateName: (name: string) => string | null;
  /** `null` when valid, otherwise a localised message. */
  validatePassword: (password: string) => string | null;
};

/**
 * Localised field validators for the auth screens.
 *
 * Pure rules live in `lib/validation.ts`; this hook only adds translation, so
 * hooks like `useLoginForm` can keep validation logic out of their callbacks.
 */
export function useAuthValidation(): AuthValidators {
  const { t } = useTranslation();

  const translateKey = useCallback(
    (key: string | null): string | null => (key === null ? null : t(key)),
    [t],
  );

  const validateEmail = useCallback(
    (email: string) => translateKey(emailErrorKey(email)),
    [translateKey],
  );

  const validateName = useCallback(
    (name: string) => translateKey(nameErrorKey(name)),
    [translateKey],
  );

  const validatePassword = useCallback(
    (password: string) => translateKey(passwordErrorKey(password)),
    [translateKey],
  );

  return { validateEmail, validateName, validatePassword };
}
