import { StatusBar } from "expo-status-bar";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import * as Print from "expo-print";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  BackHandler,
  Image,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView, type WebViewMessageEvent, type WebViewNavigation } from "react-native-webview";

const configuredAppUrl = process.env.EXPO_PUBLIC_APP_URL || "https://rebornwave.group/login";
const APP_URL = /\/login(?:[?#]|$)/i.test(configuredAppUrl)
  ? configuredAppUrl
  : `${configuredAppUrl.replace(/\/$/, "")}/login`;
const APP_NAME = process.env.EXPO_PUBLIC_APP_NAME || "Reborn Wave Group";
const PUSH_DIAGNOSTIC_URL = "https://rebornwave.group/api/v1/app/push-diagnostics";

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: true }),
});

async function getPushToken() {
  if (!Device.isDevice) throw new Error("Push notifications require a physical phone.");
  if (Platform.OS === "android") await Notifications.setNotificationChannelAsync("bridgex", { name: "BridgeXPOS alerts", importance: Notifications.AndroidImportance.HIGH, vibrationPattern: [0, 250, 250, 250] });
  const current = await Notifications.getPermissionsAsync();
  // Show Android/iOS's real permission sheet immediately. The earlier custom
  // pre-prompt could be dismissed without ever opening the system permission.
  const permission = current.status === "granted" ? current : await Notifications.requestPermissionsAsync();
  if (permission.status !== "granted") return null;
  if (Platform.OS === "android") await Notifications.getDevicePushTokenAsync();
  const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId || "e1d4fa37-5438-4cee-8f00-0b9796bc0f1d";
  return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
}

async function reportPushDiagnostic(status: string, detail?: string) {
  try {
    await fetch(PUSH_DIAGNOSTIC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, detail: detail?.slice(0, 500), platform: Platform.OS, appVersion: Constants.expoConfig?.version || "unknown", buildVersion: Constants.nativeBuildVersion || "unknown" }),
    });
  } catch {}
}

function RebornApp() {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [notificationIssue, setNotificationIssue] = useState<"permission" | "token" | null>(null);
  const [notificationDetail, setNotificationDetail] = useState("");
  const notificationSetupRunning = useRef(false);

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!canGoBack) return false;
      webViewRef.current?.goBack();
      return true;
    });
    return () => subscription.remove();
  }, [canGoBack]);

  const setupNotifications = useCallback(async () => {
    if (notificationSetupRunning.current) return;
    notificationSetupRunning.current = true;
    reportPushDiagnostic("setup_started");
    try {
      const token = await getPushToken();
      setPushToken(token);
      if (token) {
        setNotificationIssue(null);
        setNotificationDetail("");
        reportPushDiagnostic("expo_token_ready");
      }
      else {
        const permission = await Notifications.getPermissionsAsync();
        setNotificationIssue(permission.status === "granted" ? "token" : "permission");
        setNotificationDetail(permission.status === "granted" ? "Waiting for Google Play notification service." : "Android notification permission is off.");
        reportPushDiagnostic(permission.status === "granted" ? "token_missing" : "permission_denied", permission.status);
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      setNotificationIssue("token");
      setNotificationDetail(detail);
      reportPushDiagnostic("setup_error", detail);
    } finally {
      notificationSetupRunning.current = false;
    }
  }, []);

  useEffect(() => { setupNotifications(); }, [setupNotifications]);

  // Token creation needs the phone, Google Play services and Expo's endpoint.
  // Retry while any one of those is temporarily unavailable instead of
  // leaving the installation permanently disconnected after one failure.
  useEffect(() => {
    if (pushToken) return;
    const timer = setInterval(setupNotifications, 15000);
    return () => clearInterval(timer);
  }, [pushToken, setupNotifications]);

  const refreshWebData = useCallback(() => {
    webViewRef.current?.injectJavaScript(`
      window.dispatchEvent(new Event('bridgex:notification'));
      window.dispatchEvent(new Event('online'));
      true;
    `);
  }, []);

  const openNotification = useCallback((data?: Record<string, unknown>) => {
    const requestedPath = typeof data?.path === "string" ? data.path : "";
    const safePath = requestedPath.startsWith("/") && !requestedPath.startsWith("//") ? requestedPath : "";
    webViewRef.current?.injectJavaScript(`
      (function () {
        window.dispatchEvent(new Event('bridgex:notification'));
        ${safePath ? `if (location.pathname + location.search !== ${JSON.stringify(safePath)}) location.href = ${JSON.stringify(safePath)};` : ""}
      })(); true;
    `);
  }, []);

  useEffect(() => {
    const received = Notifications.addNotificationReceivedListener(() => { Notifications.setBadgeCountAsync(0).catch(() => undefined); refreshWebData(); });
    const responded = Notifications.addNotificationResponseReceivedListener((response) => {
      openNotification(response.notification.request.content.data as Record<string, unknown>);
    });
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) openNotification(response.notification.request.content.data as Record<string, unknown>);
    }).catch(() => undefined);
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") { Notifications.setBadgeCountAsync(0).catch(() => undefined); refreshWebData(); if (!pushToken) setupNotifications(); }
    });
    return () => {
      received.remove();
      responded.remove();
      appState.remove();
    };
  }, [openNotification, pushToken, refreshWebData, setupNotifications]);

  const enableNotifications = useCallback(async () => {
    const permission = await Notifications.getPermissionsAsync();
    if (permission.status !== "granted" && !permission.canAskAgain) {
      await Linking.openSettings();
      return;
    }
    await setupNotifications();
  }, [setupNotifications]);

  const syncPushToken = useCallback(() => {
    if (!pushToken) return;
    const token = JSON.stringify(pushToken);
    const platform = JSON.stringify(Platform.OS);
    webViewRef.current?.injectJavaScript(`
      (function () {
        if (window.__bridgeXPushTimer) clearInterval(window.__bridgeXPushTimer);
        function registerPushToken() {
          var companyId = localStorage.getItem('bridgexCompanyId');
          fetch('/api/v1/app/device-tokens', {
            method: 'POST', credentials: 'include',
            headers: Object.assign({'Content-Type':'application/json'}, companyId ? {'X-Company-Id':companyId} : {}),
            body: JSON.stringify({expoPushToken:${token},platform:${platform},deviceId:'expo-app'})
          }).then(function (response) {
            if (response.ok && window.__bridgeXPushTimer) {
              clearInterval(window.__bridgeXPushTimer);
              window.__bridgeXPushTimer = null;
            }
          }).catch(function () {});
        }
        registerPushToken();
        window.__bridgeXPushTimer = setInterval(registerPushToken, 10000);
        fetch('/api/auth/user', {credentials:'include'}).then(function (response) {
          if (response.ok && /^\/login\/?$/.test(location.pathname)) location.replace('/');
        }).catch(function () {});
      })(); true;
    `);
  }, [pushToken]);

  // The WebView often finishes loading before Expo finishes obtaining the
  // device token. Register again as soon as the token becomes available so a
  // fast page load can never leave the phone disconnected from push alerts.
  useEffect(() => {
    if (pushToken) syncPushToken();
  }, [pushToken, syncPushToken]);

  const retry = useCallback(() => {
    setFailed(false);
    setLoading(true);
    setReloadKey((value) => value + 1);
  }, []);

  const handleNavigation = useCallback((state: WebViewNavigation) => {
    setCanGoBack(state.canGoBack);
  }, []);

  const handleRequest = useCallback((request: { url: string }) => {
    const { url } = request;
    if (/^(https?:|about:blank)/i.test(url)) return true;
    Linking.openURL(url).catch(() => undefined);
    return false;
  }, []);

  const handleMessage = useCallback(async (event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data || "{}");
      if (message.type === "PRINT_HTML" && typeof message.html === "string") await Print.printAsync({ html: message.html });
    } catch {
      Alert.alert("Printing unavailable", "Please check that a printer is available on this device and try again.");
    }
  }, []);

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar style="light" />
      <WebView
        key={reloadKey}
        ref={webViewRef}
        source={{ uri: APP_URL }}
        style={styles.webView}
        originWhitelist={["*"]}
        javaScriptEnabled
        domStorageEnabled
        applicationNameForUserAgent="RebornWaveGroupApp/1.0"
        injectedJavaScriptBeforeContentLoaded="window.__REBORN_NATIVE_APP__=true;localStorage.setItem('reborn.nativeApp','true');true;"
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        cacheEnabled
        allowsBackForwardNavigationGestures
        pullToRefreshEnabled
        setSupportMultipleWindows={false}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        onNavigationStateChange={handleNavigation}
        onShouldStartLoadWithRequest={handleRequest}
        onMessage={handleMessage}
        onLoadProgress={({ nativeEvent }) => {
          if (nativeEvent.progress >= 0.9) setLoading(false);
        }}
        onLoadStart={() => {
          setFailed(false);
          setLoading(true);
        }}
        onLoadEnd={() => { setLoading(false); syncPushToken(); }}
        onError={() => {
          setLoading(false);
          setFailed(true);
        }}
        onHttpError={({ nativeEvent }) => {
          if (nativeEvent.statusCode >= 500) setFailed(true);
        }}
        onOpenWindow={({ nativeEvent }) => {
          Linking.openURL(nativeEvent.targetUrl).catch(() => undefined);
        }}
        onContentProcessDidTerminate={retry}
        onRenderProcessGone={retry}
      />

      {loading && !failed && (
        <View style={styles.overlay}>
          <Image source={require("./assets/icon.png")} style={styles.logo} />
          <ActivityIndicator size="large" color="#f0d787" />
          <Text selectable style={styles.loadingText}>Opening {APP_NAME}…</Text>
        </View>
      )}

      {failed && (
        <View style={styles.overlay}>
          <Image source={require("./assets/icon.png")} style={styles.logo} />
          <Text selectable style={styles.errorTitle}>Connection unavailable</Text>
          <Text selectable style={styles.errorBody}>
            Check your internet connection, then try again.
          </Text>
          <Pressable accessibilityRole="button" onPress={retry} style={styles.retryButton}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      )}

      {notificationIssue && !failed && (
        <View style={styles.notificationOverlay}>
          <Image source={require("./assets/icon.png")} style={styles.logo} />
          <Text style={styles.notificationRequiredTitle}>Phone notifications required</Text>
          <Text style={styles.notificationRequiredBody}>{notificationIssue === "permission" ? "Allow notifications to use the Reborn app. Admins receive food orders, song requests, bookings and staff updates on every screen and while the phone is locked." : "This phone is not connected to Reborn alerts yet. The app is retrying automatically."}</Text>
          {!!notificationDetail && <Text selectable style={styles.notificationDetail}>{notificationDetail}</Text>}
          <Pressable accessibilityRole="button" onPress={enableNotifications} style={styles.notificationRequiredButton}><Text style={styles.notificationRequiredButtonText}>{notificationIssue === "permission" ? "Allow phone notifications" : "Retry connection"}</Text></Pressable>
          <Text style={styles.notificationBuild}>Reborn Android build {Constants.nativeBuildVersion || "12"}</Text>
        </View>
      )}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <RebornApp />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#07101f",
  },
  webView: {
    flex: 1,
    backgroundColor: "#07101f",
  },
  overlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
    paddingHorizontal: 32,
    backgroundColor: "#07101f",
  },
  logo: {
    width: 112,
    height: 112,
    borderRadius: 28,
  },
  loadingText: {
    color: "#e8edf5",
    fontSize: 15,
  },
  errorTitle: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },
  errorBody: {
    color: "#aeb9cc",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  retryButton: {
    minWidth: 150,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: "#f0d787",
  },
  retryText: {
    color: "#15100a",
    fontSize: 16,
    fontWeight: "700",
  },
  notificationBanner: {
    position: "absolute",
    left: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(240,215,135,0.45)",
    borderRadius: 18,
    padding: 13,
    backgroundColor: "#20172f",
  },
  notificationCopy: { flex: 1 },
  notificationTitle: { color: "#f8e7aa", fontSize: 14, fontWeight: "800" },
  notificationBody: { color: "#c9c2d4", fontSize: 11, lineHeight: 16, marginTop: 2 },
  notificationButton: { borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: "#f0d787" },
  notificationButtonText: { color: "#171020", fontSize: 12, fontWeight: "900" },
  notificationOverlay: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, zIndex: 50, alignItems: "center", justifyContent: "center", paddingHorizontal: 28, backgroundColor: "#080612" },
  notificationRequiredTitle: { color: "#ffffff", fontSize: 26, lineHeight: 32, textAlign: "center", fontWeight: "900", marginTop: 22 },
  notificationRequiredBody: { color: "#d0c9dc", fontSize: 15, lineHeight: 23, textAlign: "center", marginTop: 12, maxWidth: 440 },
  notificationDetail: { color: "#f0d787", fontSize: 12, lineHeight: 17, textAlign: "center", marginTop: 14, maxWidth: 440 },
  notificationRequiredButton: { width: "100%", maxWidth: 420, borderRadius: 18, paddingHorizontal: 18, paddingVertical: 16, marginTop: 24, backgroundColor: "#f0d787" },
  notificationRequiredButtonText: { color: "#171020", fontSize: 16, textAlign: "center", fontWeight: "900" },
  notificationBuild: { color: "#746d80", fontSize: 11, marginTop: 16 },
});
