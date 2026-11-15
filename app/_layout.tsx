import React from "react";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import {
  ActivityIndicator,
  StyleSheet,
  View,
} from "react-native";
import "react-native-reanimated";

import {
  AuthProvider,
  useAuth,
} from "@/context/AuthContext";
import { withGlow } from "@/components/LLGlow";
import CrashDetectionBootstrap from "@/components/CrashDetectionBootstrap";
import { INTER_FONTS } from "@/components/ll-text";
import { LL } from "@/constants/lifelink-theme";

function RootNavigator() {
  const { isLoading } = useAuth();
  const [fontsLoaded, fontError] = useFonts(INTER_FONTS);

  if (isLoading || (!fontsLoaded && !fontError)) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator
          size="large"
          color={LL.danger}
        />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: { backgroundColor: LL.bg },
      }}
      screenLayout={withGlow}
    >
      <Stack.Screen name="index" />

      <Stack.Screen name="register" />

      <Stack.Screen name="login" />

      <Stack.Screen name="dashboard" />

      <Stack.Screen name="(tabs)" />

      <Stack.Screen name="profile" />

      <Stack.Screen name="privacy-policy" />

      <Stack.Screen name="terms" />

      {/* Emergency Screen */}
      <Stack.Screen
        name="emergency"
        options={{
          headerShown: false,
          animation: "fade",
        }}
      />

      <Stack.Screen
        name="modal"
        options={{
          presentation: "modal",
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
      <CrashDetectionBootstrap />
      <StatusBar style="light" />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: LL.bg,
  },
});