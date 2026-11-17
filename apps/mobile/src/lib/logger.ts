/* eslint-disable no-console -- this module *is* the console/Crashlytics seam. */

import crashlytics from "@react-native-firebase/crashlytics";

/**
 * The app's logging seam.
 *
 * Why this exists: `babel-plugin-transform-remove-console` strips *every*
 * `console.*` call from release builds. Caught errors logged with `console.error`
 * therefore reached nobody in production — no logcat, no Xcode console, no crash
 * report. Anything worth knowing about after a release has to be routed through
 * here instead.
 *
 *  - development: writes straight to the console, so behaviour is unchanged.
 *  - release: `info` becomes a Crashlytics *breadcrumb* (attached to future
 *    reports, never opens a new issue), while `warn`/`error` additionally
 *    record a non-fatal, so a crash report shows what the app was doing and
 *    which failures preceded it.
 *
 * `debug` deliberately stays dev-only: it carries the verbose step-by-step traces
 * (Steam sync, bulk notification sync) that would only add noise to a report.
 *
 * Keep this module dependency-free apart from Crashlytics — it is imported from
 * everywhere, including error paths.
 */

/** Whatever a `catch` clause can hand us. */
type LogPayload = unknown;

/**
 * Crashlytics only accepts an `Error`, and `catch (e)` gives us `unknown`.
 * Strings, plain objects and nullish values are normalised so a non-fatal is
 * always recorded with *something* readable attached.
 */
function toError(payload: LogPayload): Error | null {
  if (payload instanceof Error) return payload;
  if (payload === null || payload === undefined) return null;
  if (typeof payload === "string") return new Error(payload);
  try {
    return new Error(JSON.stringify(payload));
  } catch {
    return new Error(String(payload));
  }
}

/** Plain-text rendering of a log payload, for breadcrumb lines. */
function toText(payload: LogPayload): string {
  if (payload instanceof Error) return payload.message;
  if (typeof payload === "string") return payload;
  try {
    return JSON.stringify(payload);
  } catch {
    return String(payload);
  }
}

export const logger = {
  /**
   * Verbose trace of what the code is doing. Dev builds only — these lines are
   * stripped from release exactly as `console.log` used to be.
   */
  debug(message: string, ...rest: LogPayload[]): void {
    if (__DEV__) console.log(message, ...rest);
  },

  /**
   * An expected, already-handled failure (a transient network error behind a
   * cache, a login attempt with bad credentials). Dev-only console output;
   * in release it becomes a Crashlytics breadcrumb — context for a future
   * report, never a non-fatal of its own. Use `warn`/`error` for failures
   * that indicate something actually worth investigating.
   */
  info(message: string, payload?: LogPayload): void {
    if (__DEV__) {
      console.log(message, payload);
      return;
    }
    crashlytics().log(
      payload !== undefined ? `${message} ${toText(payload)}` : message,
    );
  },

  /**
   * Something failed but was handled, or the app is in a state it should not be
   * in. Reported as a non-fatal in release, visible in the console in dev.
   */
  warn(message: string, payload?: LogPayload): void {
    if (__DEV__) {
      console.warn(message, payload);
      return;
    }
    crashlytics().log(`WARN ${message}`);
    const error = toError(payload);
    if (error) crashlytics().recordError(error, `WARN ${message}`);
  },

  /**
   * A caught error that changed what the user can do (a failed save, a failed
   * fetch that left a screen empty). Reported as a non-fatal in release.
   */
  error(message: string, payload?: LogPayload): void {
    if (__DEV__) {
      console.error(message, payload);
      return;
    }
    crashlytics().log(`ERROR ${message}`);
    crashlytics().recordError(toError(payload) ?? new Error(message), message);
  },
};
