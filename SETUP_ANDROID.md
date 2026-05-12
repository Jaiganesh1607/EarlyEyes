# EarlyEyes Android Setup (Windows)

This guide sets up and runs the React Native CLI app in:

EarlyEyesAndroid/EarlyEyes

## 1) Prerequisites

- Node.js LTS (18 or 20)
- Git
- Java JDK 17
- Android Studio (for SDK + Platform Tools)

## 2) Install Android SDK (Android Studio)

1) Open Android Studio.
2) More Actions > SDK Manager.
3) SDK Platforms:
   - Install Android 14 (API 34) or latest stable.
4) SDK Tools:
   - Android SDK Platform-Tools
   - Android SDK Build-Tools
   - Android Emulator (optional)

Default SDK path:
C:\Users\<YourUser>\AppData\Local\Android\Sdk

## 3) Environment Variables (cmd.exe)

Open a new terminal and run:

```
setx JAVA_HOME "C:\Program Files\Java\jdk-17"
setx ANDROID_HOME "%LOCALAPPDATA%\Android\Sdk"
```

Then add to PATH using Windows UI to avoid truncation:

- System Properties > Environment Variables
- System variables > Path > Add:
  - C:\Program Files\Java\jdk-17\bin
  - C:\Users\<YourUser>\AppData\Local\Android\Sdk\platform-tools

Close and reopen terminal, then verify:

```
java -version
adb version
```

## 4) Install dependencies

```
cd C:\Users\Jaiganesh\earlyeyes\EarlyEyesAndroid\EarlyEyes
npm install
```

## 5) Run Metro (JS bundler)

```
npm start
```

Keep this terminal open.

## 6) Run on Android device

- Enable Developer Options and USB Debugging on the phone.
- Connect via USB (File Transfer mode).
- Accept the USB debugging prompt.

Verify device:

```
adb devices
```

Run app:

```
npm run android
```

If the app shows "Unable to load script", run:

```
adb reverse tcp:8081 tcp:8081
```

## 7) Build a debug APK for sharing

```
cd C:\Users\Jaiganesh\earlyeyes\EarlyEyesAndroid\EarlyEyes\android
gradlew assembleDebug
```

APK output:
android\app\build\outputs\apk\debug\app-debug.apk

Share this APK with teammates for install (no SDK/JDK needed).

## Troubleshooting

- Java version errors: ensure JAVA_HOME points to JDK 17.
- adb not found: add platform-tools to PATH.
- Metro SHA-1 error: run Metro with --reset-cache.
- NDK error: install NDK (Side by side) from SDK Tools.
