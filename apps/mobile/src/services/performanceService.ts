/**
 * Performance monitoring service using Firebase Performance.
 *
 * Wraps `@react-native-firebase/perf` to provide simple, reusable tracing
 * helpers.  All trace names use a consistent naming convention:
 *
 *   <feature>_<action>
 *
 * Examples:
 *   game_details_load
 *   games_search
 *   steam_sync
 */
import perf from "@react-native-firebase/perf";

// ─── Types ────────────────────────────────────────────────────────────────────

/** All named traces available in the app. Extend as you add new ones. */
export type TraceName =
  | "game_details_load"
  | "games_search"
  | "games_list_load"
  | "steam_sync"
  | "events_load"
  | "news_load"
  | "slideshow_load";

// ─── Core helper ──────────────────────────────────────────────────────────────

/**
 * Wraps an async operation in a Firebase Performance trace.
 *
 * Usage:
 * ```ts
 * const data = await withTrace("game_details_load", () => igdbApi.fetchGameById(id));
 * ```
 *
 * The trace is automatically stopped when the operation resolves or rejects.
 * Attributes can be attached to the trace for further segmentation in the
 * Firebase console.
 */
export async function withTrace<T>(
  name: TraceName,
  operation: () => Promise<T>,
  attributes?: Record<string, string>,
): Promise<T> {
  let trace: any = null;

  try {
    trace = await perf().startTrace(name);

    if (attributes) {
      Object.entries(attributes).forEach(([key, value]) => {
        trace.putAttribute(key, value);
      });
    }
  } catch (e) {
    // Firebase perf module might not be installed natively yet
  }

  try {
    const result = await operation();
    if (trace) await trace.stop();
    return result;
  } catch (error) {
    if (trace) await trace.stop();
    throw error;
  }
}

/**
 * Records a custom metric counter within an existing trace context.
 *
 * Usage:
 * ```ts
 * measureCount("games_search", "result_count", games.length);
 * ```
 *
 * Note: This helper is a simple wrapper — Firebase counters must be recorded
 * inside an active trace; use `withTrace` to manage the trace lifecycle.
 */
export async function measureCount(
  name: TraceName,
  metricName: string,
  value: number,
): Promise<void> {
  try {
    const trace = await perf().startTrace(name);
    trace.putMetric(metricName, value);
    await trace.stop();
  } catch (e) {
    // Firebase perf module might not be installed natively yet
  }
}
