/**
 * Expo Config Plugin — Disable Android ABI splits
 *
 * Injects `bundle { abi { enableSplit = false } }` into the `android { }` block of
 * android/app/build.gradle so that React Native's native libraries (e.g.
 * libreactnative.so) are always packaged inside `base.apk` instead of only in the
 * per-ABI `split_config.<abi>.apk` files.
 *
 * Why: some installs end up without the matching ABI config split (Google Play's
 * automated review devices, app-cloning / phone-transfer tools, emulators). On those
 * installs `base.apk` carries no `.so` files at all, so SoLoader fails during startup:
 *
 *   SoLoaderDSONotFoundError: couldn't find DSO to load: libreactnative.so
 *       SoSource 0: BackupSoSource[root = /data/data/<pkg>/lib-main ... apks = [.../base.apk]]
 *
 * Shipping the libraries in `base.apk` removes the dependency on that split.
 *
 * Trade-off: the download is larger because every device receives every ABI you build.
 *
 * Usage in app.json:
 *   "plugins": ["./plugins/withAbiSplitsDisabled.cjs"]
 */

const { withAppBuildGradle } = require("expo/config-plugins");

const BUNDLE_BLOCK = `    bundle {
        abi {
            enableSplit = false
        }
    }
`;

const withAbiSplitsDisabled = (config) =>
  withAppBuildGradle(config, (mod) => {
    let contents = mod.modResults.contents;

    // Already patched — idempotent guard
    if (contents.includes("enableSplit")) {
      return mod;
    }

    // Insert the `bundle { abi { enableSplit = false } }` block right after the
    // `android {` opening brace. Block order inside `android { }` is irrelevant.
    if (!/android\s*\{/.test(contents)) {
      throw new Error(
        "[withAbiSplitsDisabled] Could not find the `android {` block in app/build.gradle. " +
          "The plugin may be out of date with the Expo template.",
      );
    }

    contents = contents.replace(/android\s*\{/, (match) => `${match}\n${BUNDLE_BLOCK}`);

    mod.modResults.contents = contents;
    return mod;
  });

module.exports = withAbiSplitsDisabled;
