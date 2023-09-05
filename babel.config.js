module.exports = function(api) {
  process.env.EXPO_ROUTER_APP_ROOT = "./";
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['expo-router/babel'],
  };
};
