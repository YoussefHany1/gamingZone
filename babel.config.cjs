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

  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};
