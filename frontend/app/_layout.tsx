import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { Alert, LogBox, Platform } from "react-native";
import { useFonts } from "expo-font";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";

// Disable logbox errors etc so that users can see the app
// and agent works as expected.
LogBox.ignoreAllLogs(true);

// Alert.alert is a no-op on react-native-web; map it to browser dialogs.
if (Platform.OS === "web") {
  const style = document.createElement("style");
  style.textContent =
    "body{background:#E9E9EC}#root{max-width:760px;margin:0 auto;background:#fff;box-shadow:0 0 24px rgba(0,0,0,.08)}";
  document.head.appendChild(style);
  Alert.alert = (title, message, buttons) => {
    const text = [title, message].filter(Boolean).join("\n\n");
    if (!buttons || buttons.length < 2) {
      window.alert(text);
      buttons?.[0]?.onPress?.();
      return;
    }
    const cancel = buttons.find((b) => b.style === "cancel");
    const action = buttons.find((b) => b !== cancel) ?? buttons[buttons.length - 1];
    if (window.confirm(text)) action.onPress?.();
    else cancel?.onPress?.();
  };
}

// Keep the native splash visible from cold start until icon fonts register.
// Required because @expo/vector-icons' componentDidMount fallback fires
// Font.loadAsync against a broken vendor path if any <Icon> mounts before
// the family is registered — which throws on Android Expo Go.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [iconsLoaded, iconsError] = useIconFonts();
  const [fontsLoaded, fontsError] = useFonts({
    "PlusJakarta-Regular": require("@/assets/fonts/PlusJakartaSans-Regular.ttf"),
    "PlusJakarta-Medium": require("@/assets/fonts/PlusJakartaSans-Medium.ttf"),
    "PlusJakarta-SemiBold": require("@/assets/fonts/PlusJakartaSans-SemiBold.ttf"),
    "PlusJakarta-Bold": require("@/assets/fonts/PlusJakartaSans-Bold.ttf"),
    "PlusJakarta-ExtraBold": require("@/assets/fonts/PlusJakartaSans-ExtraBold.ttf"),
  });

  const ready = (iconsLoaded || iconsError) && (fontsLoaded || fontsError);

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#FFFFFF" } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="node/[id]" />
          <Stack.Screen name="search" />
          <Stack.Screen name="plattegrond" />
          <Stack.Screen name="geheim" />
          <Stack.Screen name="instellingen" />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
