/**
 * Shared error-message extraction. Turns any thrown value into a readable
 * message (Error → `.message`, everything else → `String(...)`) so that every
 * job/services logs and reports failures through a single consistent shape.
 */
export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
