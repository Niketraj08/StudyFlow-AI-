# StudyFlow AI — Android Build Guide

Everything is pre-configured. Run these commands on your **own computer** (Lovable's sandbox can't compile Android).

## What's already set up

- `capacitor.config.ts` — appId `app.lovable.studyflowai`, dark background, splash screen (1.5s fade), dark status bar.
- `resources/icon.png` (1024×1024) + `resources/splash.png` (1920×1920) — used to auto-generate every Android icon/splash density.
- `assets.config.json` — adaptive icon config with dark background.
- `android-signing/` — signing config templates.
- `.gitignore` — keystores and secrets excluded.

## One-time computer setup

1. Install [Node.js 20+](https://nodejs.org/), [Java 21 JDK](https://adoptium.net/), and [Android Studio](https://developer.android.com/studio) (installs the Android SDK).
2. Export the project to GitHub from Lovable (top-right → GitHub → Connect) and `git clone` it.
3. In the project folder:
   ```bash
   npm install
   npx cap add android
   npx capacitor-assets generate --android
   npx cap sync android
   ```
   `capacitor-assets generate` generates every icon/splash density from `resources/` into the native Android project.

## Debug APK (fast, for personal install)

```bash
cd android
./gradlew assembleDebug
```

Output: `android/app/build/outputs/apk/debug/app-debug.apk` — email/AirDrop to your phone and install.

---

## Signed release APK + AAB (Play Store ready)

### 1. Generate your keystore (do this ONCE and keep it forever)

⚠️ If you lose this keystore, you can **never update the app on Play Store again** — back it up somewhere safe (password manager, encrypted drive).

```bash
keytool -genkey -v \
  -keystore studyflow-release.jks \
  -alias studyflow \
  -keyalg RSA -keysize 2048 -validity 10000
```

Answer the prompts (name, org, country) and set a strong password.

### 2. Wire the keystore into the Android project

```bash
# From project root:
mv studyflow-release.jks android/studyflow-release.jks
cp android-signing/keystore.properties.example android/keystore.properties
```

Edit `android/keystore.properties` and fill in:
```properties
storeFile=studyflow-release.jks
storePassword=your-actual-password
keyAlias=studyflow
keyPassword=your-actual-password
```

### 3. Add the signing config to Gradle

Open `android/app/build.gradle` and follow the snippet in `android-signing/build.gradle.signing-snippet.txt` — paste the two blocks it shows into the file.

### 4. Build the signed artifacts

```bash
cd android

# Signed APK (for direct install / sideload)
./gradlew assembleRelease
# → android/app/build/outputs/apk/release/app-release.apk

# Signed AAB (required for Play Store upload)
./gradlew bundleRelease
# → android/app/build/outputs/bundle/release/app-release.aab
```

### 5. Verify the signature

```bash
$ANDROID_HOME/build-tools/34.0.0/apksigner verify --print-certs \
  android/app/build/outputs/apk/release/app-release.apk
```

You should see your certificate fingerprint. Ready to upload to [Play Console](https://play.google.com/console).

---

## Updating

| Change | What to do |
| --- | --- |
| App content (any Lovable edit) | Just publish in Lovable — installed APKs pick it up on next open |
| Icon or splash | Edit `resources/icon.png` / `resources/splash.png`, rerun `npx capacitor-assets generate --android` + `./gradlew assembleRelease` |
| App version (Play Store update) | Bump `versionCode` and `versionName` in `android/app/build.gradle`, rebuild AAB |
| Custom domain | Edit `server.url` in `capacitor.config.ts`, run `npx cap sync android`, rebuild |

## Play Store submission checklist

- [ ] Signed AAB built with your permanent keystore
- [ ] Keystore backed up in a safe place
- [ ] `versionCode` incremented from previous release
- [ ] App icon 512×512 (Play Store listing) — resize `resources/icon.png`
- [ ] Feature graphic 1024×500 (create in any editor)
- [ ] Screenshots from your phone (min 2, phone size)
- [ ] Privacy policy URL (Play Store requires one)
- [ ] Content rating questionnaire completed in Play Console
