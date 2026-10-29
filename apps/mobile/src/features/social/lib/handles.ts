/**
 * Client-side handle helpers.
 *
 * The rules themselves live in `@gaming-zone/core` so the backend, both
 * clients and the migration validate identically. This module only adds what is
 * specific to the React Native client: recognising the backend's "taken"
 * rejection and walking the generated-candidate list.
 */
export {
  HANDLE_MAX_LENGTH,
  HANDLE_MIN_LENGTH,
  handleCandidates,
  normalizeHandle,
  validateHandle,
  type HandleErrorCode,
  type HandleValidation,
} from "@gaming-zone/core";

/**
 * True when the handle claim was rejected because another account owns it.
 *
 * The backend answers 409 with `{ code: "handle_taken" }`; the message check is
 * kept so an older deployment that only surfaced text still maps correctly.
 */
export function isHandleTakenError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;

  const { code, message, status } = error as {
    code?: unknown;
    message?: unknown;
    status?: unknown;
  };
  return (
    code === "handle_taken" ||
    status === 409 ||
    message === "handle_taken" ||
    (typeof message === "string" && message.includes("handle_taken"))
  );
}
