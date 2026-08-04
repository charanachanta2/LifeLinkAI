import { Tabs } from "expo-router";
import React from "react";
import { Text } from "react-native";

import { HapticTab } from "@/components/haptic-tab";

export default function FireStationTabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#C2410C",
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="reports"
        options={{
          title: "Reports",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🔥</Text>,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: "Station",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🚒</Text>,
        }}
      />
    </Tabs>
  );
}