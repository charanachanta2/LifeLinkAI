import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { AuthProvider, useAuth } from "@/context/AuthContext";

// This inner component reads the auth state and decides what to show.
// It has to live INSIDE <AuthProvider> to access useAuth().
function RootNavigator() {
  const { isLoading } = useAuth();

  // Still checking SecureStore for a saved session — show a brief splash
  // instead of flashing the login screen for a split second.
  if (isLoading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#DC2626" />
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="register"
        options={{ title: "Register", headerShown: false }}
      />
      <Stack.Screen name="spinner" options={{ headerShown: false }} />
      <Stack.Screen
        name="login"
        options={{ title: "Login", headerShown: false }}
      />
      <Stack.Screen
        name="dashboard"
        options={{ title: "Dashboard", headerShown: false }}
      />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="profile"
        options={{ title: "Profile", headerShown: false }}
      />
      <Stack.Screen
        name="modal"
        options={{ presentation: "modal", title: "Modal" }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <RootNavigator />
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
});