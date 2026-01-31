# Mobile App Build Instructions

This project is configured to be built as a mobile application for Android and iOS using [Capacitor](https://capacitorjs.com/).

## Prerequisites

To build the mobile apps, you need to set up your development environment.

### For Android
1.  **Install Java (JDK):**
    *   Download and install JDK 17 (or JDK 11).
    *   Ensure `JAVA_HOME` environment variable is set correctly.
2.  **Install Android Studio:**
    *   Download from [developer.android.com](https://developer.android.com/studio).
    *   Install the Android SDK and Android SDK Command-line Tools via Android Studio's SDK Manager.

### For iOS (Mac Required)
1.  **Xcode:**
    *   Install Xcode from the Mac App Store.
    *   Install CocoaPods: `sudo gem install cocoapods`.

## Building the App

### 1. Build the Web Assets
First, build the Next.js project to generate the static files in the `out` directory.

```bash
npm run build
```

### 2. Sync with Capacitor
Sync the web assets to the native projects.

```bash
npx cap sync
```

### 3. Build for Android (AAB)
1.  Open the Android project in Android Studio:
    ```bash
    npx cap open android
    ```
2.  Wait for Gradle sync to finish.
3.  Go to **Build** > **Generate Signed Bundle / APK**.
4.  Select **Android App Bundle (AAB)** and click **Next**.
5.  Create a new Key store (or choose an existing one) to sign your app.
    *   *Keep your keystore file and password safe! You cannot update your app on the Play Store without it.*
6.  Select **Release** build variant.
7.  Click **Finish**. The `.aab` file will be generated in `android/app/release/`.

### 4. Build for iOS (IPA)
1.  Open the iOS project in Xcode:
    ```bash
    npx cap open ios
    ```
2.  Select your App Team in the project settings (Signing & Capabilities).
3.  Select "Any iOS Device (arm64)" as the target.
4.  Go to **Product** > **Archive**.
5.  Once archiving is complete, the Organizer window will open.
6.  Click **Distribute App** to upload to App Store Connect or export the `.ipa` file.

## Troubleshooting

*   **Java Errors:** Ensure `java -version` returns version 11 or 17. If it shows 1.8 or 1.6, update your JDK and check your PATH.
*   **Gradle Errors:** Try cleaning the project in Android Studio (**Build** > **Clean Project**).
*   **Permissions:** If the app needs internet access (which it does), ensure `<uses-permission android:name="android.permission.INTERNET" />` is in `android/app/src/main/AndroidManifest.xml` (this is usually added by default).

## Updates
Whenever you make changes to the React/Next.js code:
1.  Run `npm run build`.
2.  Run `npx cap sync`.
3.  Re-build the native app.
