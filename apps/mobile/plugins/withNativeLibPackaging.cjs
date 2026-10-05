/**
 * Expo Config Plugin — Native library packaging (SoLoader fix)
 *
 * `useLegacyPackaging` alone only controls how `.so` files are packaged into the
 * APK. It does NOT affect the APKs that Google Play generates from an App Bundle,
 * which keep native libs uncompressed so they are never extracted to
 * `ApplicationInfo.nativeLibraryDir`.
 *
 * SoLoader resolves libraries through that extracted directory
 * (`/data/app/.../lib/<abi>`), so on a bundle-based Play build it cannot find
 * `libreactnative.so` and the app dies in `Application.onCreate` with:
 *
 *   com.facebook.soloader.SoLoaderDSONotFoundError: couldn't find DSO to load: libreactnative.so
 *
 * `useLegacyPackagingFromBundle = true` compresses the libs in the bundle as well,
 * so Play extracts them at install time and SoLoader finds them.
 *
 * Usage in app.json:
 *   "plugins": ["./plugins/withNativeLibPackaging"]
 */

const { withAppBuildGradle } = require("expo/config-plugins");

const LEGACY_PACKAGING_BLOCK =
  /( *)def enableLegacyPackaging = findProperty\('expo\.useLegacyPackaging'\)[^\n]*\n *useLegacyPackaging enableLegacyPackaging\.toBoolean\(\)/;

const withNativeLibPackaging = (config) =>
  withAppBuildGradle(config, (mod) => {
    let contents = mod.modResults.contents;

    // Already patched — idempotent guard
    if (contents.includes("useLegacyPackagingFromBundle")) {
      return mod;
    }

    if (!LEGACY_PACKAGING_BLOCK.test(contents)) {
      throw new Error(
        "withNativeLibPackaging: could not find the jniLibs packaging block in android/app/build.gradle."
      );
    }

    contents = contents.replace(
      LEGACY_PACKAGING_BLOCK,
      (_match, indent) =>
        `${indent}useLegacyPackaging = true\n${indent}useLegacyPackagingFromBundle = true`
    );

    mod.modResults.contents = contents;
    return mod;
  });

module.exports = withNativeLibPackaging;
