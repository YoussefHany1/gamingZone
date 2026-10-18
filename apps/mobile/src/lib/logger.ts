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
 *  - release: `warn`/`error` become Crashlytics breadcrumbs and non-fatals, so a
 *    crash report shows what the app was doing and which failures preceded it.
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

export const logger = {
  /**
   * Verbose trace of what the code is doing. Dev builds only — these lines are
   * stripped from release exactly as `console.log` used to be.
   */
  debug(message: string, ...rest: LogPayload[]): void {
    if (__DEV__) console.log(message, ...rest);
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
