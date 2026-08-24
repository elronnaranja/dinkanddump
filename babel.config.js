module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // Reanimated v4 moved its worklet transform into react-native-worklets —
    // the old react-native-reanimated/plugin entry silently stops
    // transforming worklets if left in place (no build error, just broken
    // animations at runtime). Must still be listed last (see
    // https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/getting-started).
    plugins: ["react-native-worklets/plugin"],
  };
};
