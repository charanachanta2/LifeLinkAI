import { Stack } from "expo-router";
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

function RootNavigator() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator
          size="large"
          color="#DC2626"
        />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
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
      <StatusBar style="auto" />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
});