/**
 * Expo Config Plugin — R8 Full-Mode Optimization
 *
 * Applies the following Android native changes so they survive `expo prebuild --clean`:
 *  1. gradle.properties → android.enableR8.fullMode=true
 *  2. app/build.gradle  → proguard-android-optimize.txt + minifyEnabled true + shrinkResources true
 *
 * Usage in app.json:
 *   "plugins": ["./plugins/withR8Optimization"]
 */

const { withGradleProperties, withAppBuildGradle } = require("expo/config-plugins");

// ─── 1. gradle.properties ────────────────────────────────────────────────────

/**
 * Adds / updates R8-related properties in gradle.properties.
 */
const withR8GradleProperties = (config) =>
  withGradleProperties(config, (mod) => {
    const props = mod.modResults;

    const set = (key, value) => {
      const existing = props.find((p) => p.type === "property" && p.key === key);
      if (existing) {
        existing.value = value;
      } else {
        props.push({ type: "property", key, value });
      }
    };

    set("android.enableR8.fullMode", "true");
    set("android.enableMinifyInReleaseBuilds", "true");
    set("android.enableShrinkResourcesInReleaseBuilds", "true");

    return mod;
  });

// ─── 2. app/build.gradle ─────────────────────────────────────────────────────

/**
 * Patches the release buildType in app/build.gradle to:
 *  - Use proguard-android-optimize.txt  (enables R8 optimizations)
 *  - Hard-code minifyEnabled true
 *  - Hard-code shrinkResources true
 */
const withR8BuildGradle = (config) =>
  withAppBuildGradle(config, (mod) => {
    let contents = mod.modResults.contents;

    // Already patched — idempotent guard
    if (contents.includes("proguard-android-optimize.txt")) {
      return mod;
    }

    // Replace proguard-android.txt → proguard-android-optimize.txt
    contents = contents.replace(
      /getDefaultProguardFile\(["']proguard-android\.txt["']\)/g,
      'getDefaultProguardFile("proguard-android-optimize.txt")'
    );

    // Replace the dynamic minifyEnabled / shrinkResources with hard-coded true values.
    // Pattern: inside the release { } block.
    contents = contents.replace(
      /def enableShrinkResources\s*=.*?\nshrinkResources\s+enableShrinkResources\.toBoolean\(\)\s*\nminifyEnabled\s+enableMinifyInReleaseBuilds/s,
      "// R8 full-mode (managed by withR8Optimization config plugin)\n            minifyEnabled true\n            shrinkResources true"
    );

    // Fallback: if the pattern above didn't match (already partially patched),
    // ensure both flags are explicitly set to true.
    if (!contents.includes("minifyEnabled true")) {
      contents = contents.replace(
        /minifyEnabled\s+\w+/,
        "minifyEnabled true"
      );
    }
    if (!contents.includes("shrinkResources true")) {
      contents = contents.replace(
        /shrinkResources\s+\w+/,
        "shrinkResources true"
      );
    }

    mod.modResults.contents = contents;
    return mod;
  });

// ─── Composed plugin ──────────────────────────────────────────────────────────

const withR8Optimization = (config) => {
  config = withR8GradleProperties(config);
  config = withR8BuildGradle(config);
  return config;
};

module.exports = withR8Optimization;
