const fs = require('fs');
const path = require('path');

const androidDir = path.join(
  __dirname, '..', 'node_modules', '@maniac-tech',
  'react-native-expo-read-sms', 'android'
);

if (fs.existsSync(androidDir) === false) {
  console.log('[patch-sms] library not installed, skipping');
  process.exit(0);
}

const buildGradle = `apply plugin: 'com.android.library'

def safeExtGet(prop, fallback) {
  rootProject.ext.has(prop) ? rootProject.ext.get(prop) : fallback
}

android {
  namespace "com.reactlibrary"
  compileSdkVersion safeExtGet('compileSdkVersion', 34)

  defaultConfig {
    minSdkVersion safeExtGet('minSdkVersion', 21)
    targetSdkVersion safeExtGet('targetSdkVersion', 34)
  }

  lintOptions { abortOnError false }
}

repositories {
  mavenCentral()
  google()
}

dependencies {
  implementation 'com.facebook.react:react-native:+'
}
`;

const manifest = `<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.READ_SMS" />
    <uses-permission android:name="android.permission.RECEIVE_SMS" />
</manifest>
`;

fs.writeFileSync(path.join(androidDir, 'build.gradle'), buildGradle);
fs.writeFileSync(path.join(androidDir, 'src', 'main', 'AndroidManifest.xml'), manifest);
console.log('[patch-sms] Patched react-native-expo-read-sms for AGP 8 / RN 0.74');
