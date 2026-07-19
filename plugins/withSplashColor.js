// Local Expo config plugin.
// Expo prebuild generates android/app/src/main/res/drawable/splashscreen.xml,
// which references @color/splashscreen_background. When expo-splash-screen is
// not installed, that color is never written to colors.xml and the Android
// resource linker (:app:processReleaseResources / AAPT) fails with:
//   "resource color/splashscreen_background ... not found".
// This plugin defines the color during prebuild so linking succeeds.
//
// Import from "expo/config-plugins" (re-export) rather than "@expo/config-plugins"
// so it resolves from a normal install without relying on package hoisting.
const { withAndroidColors, AndroidConfig } = require('expo/config-plugins');

// Keep in sync with the app's root background (App.js styles.root).
const SPLASH_BACKGROUND = '#05070d';

module.exports = function withSplashColor(config) {
  return withAndroidColors(config, (cfg) => {
    cfg.modResults = AndroidConfig.Colors.assignColorValue(cfg.modResults, {
      name: 'splashscreen_background',
      value: SPLASH_BACKGROUND,
    });
    return cfg;
  });
};
