// Default Expo config; on web only, expo-notifications is replaced by a no-op shim (used for screenshots).
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");
const config = getDefaultConfig(__dirname);
const orig = config.resolver.resolveRequest;
config.resolver.resolveRequest = (ctx, name, platform) => {
  if (platform === "web" && name === "expo-notifications") {
    return { type: "sourceFile", filePath: path.join(__dirname, "scripts/web-screens/webshim/notifications.js") };
  }
  // web: Animated writes transform / opacity frames straight to the DOM instead of re-rendering (src/platform/web/useAnimatedProps.js)
  if (platform === "web" && name === "./useAnimatedProps" && /react-native-web[\\/]dist[\\/]vendor[\\/]react-native[\\/]Animated/.test(ctx.originModulePath)) {
    return { type: "sourceFile", filePath: path.join(__dirname, "src/platform/web/useAnimatedProps.js") };
  }
  return orig ? orig(ctx, name, platform) : ctx.resolveRequest(ctx, name, platform);
};
module.exports = config;
