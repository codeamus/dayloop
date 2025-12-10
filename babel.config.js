// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // Necesario para Expo Router
      "expo-router/babel",
      // ⚠️ SIEMPRE el último plugin: Reanimated
      "react-native-reanimated/plugin",
    ],
  };
};
