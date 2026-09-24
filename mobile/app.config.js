const base = require("./app.base.json").expo;

// EAS can build one fully branded binary per customer from the same source.
// Example: EXPO_PUBLIC_APP_NAME="Acme POS" EXPO_APP_SLUG=acme-pos EXPO_ANDROID_PACKAGE=com.acme.pos ... eas build
module.exports = () => {
  const appName = process.env.EXPO_PUBLIC_APP_NAME || base.name;
  return ({
  ...base,
  name: appName,
  slug: process.env.EXPO_APP_SLUG || base.slug,
  owner: process.env.EXPO_OWNER || base.owner,
  scheme: process.env.EXPO_APP_SCHEME || base.scheme,
  icon: process.env.EXPO_APP_ICON || base.icon,
  ios: {
    ...base.ios,
    bundleIdentifier: process.env.EXPO_IOS_BUNDLE_ID || base.ios.bundleIdentifier,
    infoPlist: {
      ...base.ios.infoPlist,
      NSCameraUsageDescription: `${appName} uses the camera to scan QR codes and upload images you select.`,
      NSPhotoLibraryUsageDescription: `${appName} uses your photo library when you select an image.`,
      NSMicrophoneUsageDescription: `${appName} uses the microphone for media features you start.`,
    },
  },
  android: {
    ...base.android,
    package: process.env.EXPO_ANDROID_PACKAGE || base.android.package,
    googleServicesFile: process.env.EXPO_GOOGLE_SERVICES_FILE || "./google-services.json",
  },
  extra: {
    ...base.extra,
    tenantSlug: process.env.EXPO_TENANT_SLUG || "reborn-wave-group",
    eas: {
      ...base.extra.eas,
      projectId: process.env.EXPO_PROJECT_ID || base.extra.eas.projectId,
    },
  },
  });
};
