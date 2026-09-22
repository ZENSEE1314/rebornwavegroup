# Reborn Wave Group mobile app

This Expo app packages the complete Reborn member experience for iOS and Android. It opens the production login at `https://rebornwave.group/login` inside a native shell with shared login cookies, Android back-button support, pull-to-refresh, external-link handling, branded loading, and connection recovery.

## Local development

```bash
npm install
npm start
```

Open the QR code in Expo Go. Set `EXPO_PUBLIC_APP_URL` in `.env` to test a different HTTPS deployment.

## Expo account and identifiers

- Expo owner: `zensee`
- Expo slug: `reborn-wave-group`
- iOS bundle identifier: `com.zensee.rebornwavegroup`
- Android application ID: `com.zensee.rebornwavegroup`

Link the local project after authenticating the Expo CLI:

```bash
npx eas-cli@latest login
npx eas-cli@latest init
```

## Builds

```bash
# Installable Android APK for testing
npx eas-cli@latest build --platform android --profile preview

# App Store and Google Play production artifacts
npx eas-cli@latest build --platform all --profile production
```

An Apple Developer membership is required to sign an iOS device/App Store build. Google Play submission requires a Play Console developer account and service-account credentials. Building artifacts does not publish them to either store.
