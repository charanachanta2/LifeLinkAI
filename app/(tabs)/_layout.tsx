import { Tabs } from "expo-router";
import React from "react";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { withGlow } from "@/components/LLGlow";
import { LL } from "@/constants/lifelink-theme";

export default function TabLayout() {
  return (
    <Tabs
      screenLayout={withGlow}
      screenOptions={{
        sceneStyle: { backgroundColor: LL.bg },
        tabBarActiveTintColor: LL.accent,
        tabBarInactiveTintColor: LL.textMuted,
        tabBarStyle: {
          backgroundColor: LL.surface,
          borderTopColor: LL.border,
          borderTopWidth: 1,
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
        },
        tabBarLabelStyle: { fontWeight: "700" },
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="map-activity"
        options={{
          title: "Map Activity",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="map.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: "Analytics",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="chart.bar.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="house.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="blood-bank"
        options={{
          title: "Blood Bank",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="drop.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="find-emergency"
        options={{
          title: "Emergency",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="cross.case.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}