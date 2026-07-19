# Goal Board (Expo + EAS cloud build)

Neon GYM scoreboard. Bar fills toward INR 4000, driven by PNB bank SMS.
No Android Studio needed - the APK is built in the cloud by EAS, then sideloaded.

## Build the APK with EAS (no Android Studio)
You only need Node + the lightweight eas-cli (works on any low-spec laptop),
or the phone-only route below.

Route A - from a computer (any OS, small install):
1. npm install
2. npm i -g eas-cli
3. eas login            (free Expo account)
4. eas build:configure
5. eas build -p android --profile preview
6. When it finishes, EAS gives a download link. Open it on your phone,
   download the APK, and install (allow "install unknown apps").
7. Launch, grant the SMS permission. It tracks PNB SMS on account X7046.

Route B - phone only (no computer):
1. Push this folder to a GitHub repo (GitHub mobile / web works).
2. Go to expo.dev, create a project, connect the repo.
3. Trigger a build (profile: preview) from the EAS dashboard in your browser.
4. Download the APK to your phone and install as above.

## Config / rewire
Top of App.js: ACCOUNT, GOAL_NAME, TARGET, SEED.
USE_MOCK is already false (real SMS). Set true only if you ever test in Expo Go.

## SMS reliability notes (important)
- Use the "preview"/"production" standalone APK (this setup), NOT a dev client, for
  a background SMS receiver that survives app close.
- On Xiaomi/MIUI, Oppo, Vivo, Realme: enable "Autostart" for the app and disable
  battery optimization, or the OS kills the SMS receiver in the background.
- READ_SMS/RECEIVE_SMS apps are restricted on the Play Store - keep it sideloaded.
