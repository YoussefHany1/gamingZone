/**
 * Drop-in replacement for the deprecated `InteractionManager.runAfterInteractions`.
 *
 * Uses `requestIdleCallback` when available (RN 0.73+), falling back to a
 * short `setTimeout` so the current frame can finish painting first.
 */
export function runAfterInteractions(fn: () => void): { cancel: () => void } {
  let cancelled = false;
  const handle =
    typeof requestIdleCallback === "function"
      ? requestIdleCallback(() => {
          if (!cancelled) fn();
        })
      : setTimeout(() => {
          if (!cancelled) fn();
        }, 0);

  return {
    cancel() {
      cancelled = true;
      if (typeof requestIdleCallback === "function") {
        cancelIdleCallback(handle as number);
      } else {
        clearTimeout(handle as ReturnType<typeof setTimeout>);
      }
    },
  };
}
