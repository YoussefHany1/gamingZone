module.exports = function(api) {
  api.cache(true);
  const plugins = [];

  // Strip console.* in production builds.
  // NODE_ENV covers standard builds; APP_VARIANT / EAS_BUILD cover Expo EAS
  // release builds where NODE_ENV may not be set to 'production'.
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    process.env.APP_VARIANT === 'production' ||
    process.env.EAS_BUILD === 'true';

  if (isProduction) {
    plugins.push('babel-plugin-transform-remove-console');
  }

  // Required for react-native-reanimated v4 — must be last plugin.
  // Without this, Reanimated uses synchronouslyUpdateUIProps on the main thread,
  // which blocks UI rendering (especially with SVG + ScrollView) and causes ANR.
  plugins.push('react-native-reanimated/plugin');

  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};

