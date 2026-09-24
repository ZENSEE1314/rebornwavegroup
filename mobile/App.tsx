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

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: true }),
});

async function getPushToken() {
  if (!Device.isDevice) return null;
  if (Platform.OS === "android") await Notifications.setNotificationChannelAsync("bridgex", { name: "BridgeXPOS alerts", importance: Notifications.AndroidImportance.HIGH, vibrationPattern: [0, 250, 250, 250] });
  const current = await Notifications.getPermissionsAsync();
  if (current.status !== "granted" && current.canAskAgain) {
    const accepted = await new Promise<boolean>((resolve) => Alert.alert(
      "Enable instant updates",
      "Allow notifications to receive new orders, bookings, song requests, meetings and staff updates immediately.",
      [
        { text: "Not now", style: "cancel", onPress: () => resolve(false) },
        { text: "Allow notifications", onPress: () => resolve(true) },
      ],
      { cancelable: false },
    ));
    if (!accepted) return null;
  }
  const permission = current.status === "granted" ? current : await Notifications.requestPermissionsAsync();
  if (permission.status !== "granted") return null;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
  if (!projectId) return null;
  return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
}

function RebornApp() {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [pushToken, setPushToken] = useState<string | null>(null);

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!canGoBack) return false;
      webViewRef.current?.goBack();
      return true;
    });
    return () => subscription.remove();
  }, [canGoBack]);

  useEffect(() => {
    getPushToken().then(setPushToken).catch(() => undefined);
  }, []);

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
    const received = Notifications.addNotificationReceivedListener(() => refreshWebData());
    const responded = Notifications.addNotificationResponseReceivedListener((response) => {
      openNotification(response.notification.request.content.data as Record<string, unknown>);
    });
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) openNotification(response.notification.request.content.data as Record<string, unknown>);
    }).catch(() => undefined);
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshWebData();
    });
    return () => {
      received.remove();
      responded.remove();
      appState.remove();
    };
  }, [openNotification, refreshWebData]);

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
});
