import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView, type WebViewNavigation } from "react-native-webview";

const APP_URL = process.env.EXPO_PUBLIC_APP_URL || "https://rebornwave.group";

function RebornApp() {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!canGoBack) return false;
      webViewRef.current?.goBack();
      return true;
    });
    return () => subscription.remove();
  }, [canGoBack]);

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
        allowsBackForwardNavigationGestures
        pullToRefreshEnabled
        setSupportMultipleWindows={false}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        onNavigationStateChange={handleNavigation}
        onShouldStartLoadWithRequest={handleRequest}
        onLoadStart={() => {
          setFailed(false);
          setLoading(true);
        }}
        onLoadEnd={() => setLoading(false)}
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
      />

      {loading && !failed && (
        <View style={styles.overlay}>
          <Image source={require("./assets/icon.png")} style={styles.logo} />
          <ActivityIndicator size="large" color="#f0d787" />
          <Text selectable style={styles.loadingText}>Opening Reborn Wave Group…</Text>
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
