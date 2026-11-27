/**
 * Expo Config Plugin — R8 Full-Mode Optimization
 *
 * Applies the following Android native changes so they survive `expo prebuild --clean`:
 *  1. gradle.properties → android.enableR8.fullMode=true
 *  2. app/build.gradle  → proguard-android-optimize.txt + minifyEnabled true + shrinkResources true
 *  3. local release signing → environment-provided keystore when available,
 *     with the generated debug key retained only as an explicit local fallback
 *
 * Usage in app.json:
 *   "plugins": ["./plugins/withR8Optimization"]
 */

const fs = require("node:fs");
const path = require("node:path");
const {
  withGradleProperties,
  withAppBuildGradle,
  withDangerousMod,
} = require("expo/config-plugins");

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

    // Replace the generated version from app.json on every prebuild. The
    // android directory is intentionally untracked in this CNG project.
    if (config.version) {
      contents = contents.replace(
        /versionName\s+["'][^"']+["']/,
        `versionName "${config.version}"`,
      );
    }

    // Local release builds may provide a real keystore through environment
    // variables. EAS credentials injection remains responsible for cloud
    // signing; without local variables, retain the generated debug fallback
    // rather than failing configuration at prebuild time.
    if (!contents.includes("signingConfigs.release")) {
      contents = contents.replace(
        /\n\s*}\s*\n\s*buildTypes\s*\{/,
        `
        release {
            def localKeystore = System.getenv("ANDROID_KEYSTORE")
            if (localKeystore != null) {
                storeFile file(localKeystore)
                storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")
                keyAlias System.getenv("ANDROID_KEY_ALIAS")
                keyPassword System.getenv("ANDROID_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
`,
      );
    }

    const releaseSigning = `signingConfig signingConfigs.debug
            // Local override; EAS replaces signing credentials in cloud builds.
            if (System.getenv("ANDROID_KEYSTORE") != null) {
                signingConfig signingConfigs.release
            }`;
    contents = contents.replace(
      /signingConfig signingConfigs\.debug\s*\n(\s*def enableShrinkResources)/,
      `${releaseSigning}\n            $1`,
    );

    // Already patched — idempotent guard for the R8 transforms below.
    if (contents.includes("proguard-android-optimize.txt")) {
      mod.modResults.contents = contents;
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

const PROGUARD_RULES = `-keepclassmembers public class com.facebook.react.ReactActivityDelegate {
  public *;
  protected *;
  private ReactDelegate mReactDelegate;
}
-keepclassmembers public class expo.modules.ReactActivityDelegateWrapper {
  protected ReactDelegate getReactDelegate();
}
-keepclassmembers public class com.facebook.react.ReactActivity {
  private final ReactActivityDelegate mDelegate;
}
-keepclassmembers public class com.facebook.react.ReactNativeHost {
  protected *;
}
-keepclassmembers public class expo.modules.ExpoModulesPackageList {
  public *;
}
-keepnames class * extends expo.modules.core.BasePackage
-keepnames class * implements expo.modules.core.interfaces.Package
-keep class com.squareup.zstd.** { *; }
-keep class com.facebook.animated.gif.GifImageDecoder { public <init>(...); }
-keep class com.facebook.animated.webp.WebPImageDecoder { public <init>(...); }
-assumenosideeffects class android.view.Window {
  public void setStatusBarColor(int);
  public void setNavigationBarColor(int);
}
-assumevalues class android.view.WindowManager$LayoutParams {
  public int layoutInDisplayCutoutMode return 3;
}
`;

const withProguardRules = (config) =>
  withDangerousMod(config, [
    "android",
    async (modConfig) => {
      const rulesPath = path.join(
        modConfig.modRequest.platformProjectRoot,
        "app",
        "proguard-rules.pro",
      );
      fs.writeFileSync(rulesPath, PROGUARD_RULES);
      return modConfig;
    },
  ]);

// ─── Composed plugin ──────────────────────────────────────────────────────────

const withR8Optimization = (config) => {
  config = withR8GradleProperties(config);
  config = withR8BuildGradle(config);
  config = withProguardRules(config);
  return config;
};

module.exports = withR8Optimization;
