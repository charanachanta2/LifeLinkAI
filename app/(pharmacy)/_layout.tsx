import { Tabs } from "expo-router";
import React from "react";
import { Text } from "react-native";

import { HapticTab } from "@/components/haptic-tab";

export default function PharmacyTabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#15803D",
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="reports"
        options={{
          title: "Requests",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>💊</Text>,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: "Pharmacy",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🏪</Text>,
        }}
      />
    </Tabs>
  );
}