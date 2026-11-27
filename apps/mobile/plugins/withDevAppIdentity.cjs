const fs = require("node:fs");
const path = require("node:path");
const {
  withAppBuildGradle,
  withDangerousMod,
} = require("expo/config-plugins");

const DEBUG_APPLICATION_ID_SUFFIX = ".dev";

const escapeXml = (value) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const withDebugApplicationId = (config) =>
  withAppBuildGradle(config, (mod) => {
    const debugBlock = /(buildTypes\s*\{[\s\S]*?\n\s*debug\s*\{)([\s\S]*?)(\n\s*\})/;

    mod.modResults.contents = mod.modResults.contents.replace(
      debugBlock,
      (match, open, body, close) => {
        if (body.includes("applicationIdSuffix")) return match;
        return `${open}\n            applicationIdSuffix "${DEBUG_APPLICATION_ID_SUFFIX}"${body}${close}`;
      },
    );

    return mod;
  });

const withDebugAppName = (config) =>
  withDangerousMod(config, [
    "android",
    async (modConfig) => {
      const rawName = String(config.name ?? "Gaming Zone");
      const devName = `${rawName.replace(/\s*\(Dev\)$/, "")} (Dev)`;
      const valuesDir = path.join(
        modConfig.modRequest.platformProjectRoot,
        "app",
        "src",
        "debug",
        "res",
        "values",
      );

      fs.mkdirSync(valuesDir, { recursive: true });
      fs.writeFileSync(
        path.join(valuesDir, "strings.xml"),
        `<resources>\n  <string name="app_name">${escapeXml(devName)}</string>\n</resources>\n`,
      );

      return modConfig;
    },
  ]);

const withDevAppIdentity = (config) => {
  config = withDebugApplicationId(config);
  config = withDebugAppName(config);
  return config;
};

module.exports = withDevAppIdentity;
