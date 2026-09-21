import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import type { ColorValue } from "react-native";

import { HapticTab } from "@/components/haptic-tab";
import { themeFor } from "@/constants/agency";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

// Big, high-contrast tab icons. Ionicons take the tab colour, so the
// active tab is clearly coloured in the agency's colour and inactive
// tabs are dark grey (the old emoji icons ignored colour and were tiny).
const tabIcon =
  (filled: IconName, outline: IconName) =>
  ({ color, focused }: { color: ColorValue; focused: boolean }) =>
    <Ionicons name={focused ? filled : outline} size={27} color={color} />;

// Shared bottom tabs for police / hospital / fire station / pharmacy:
//   Reports (list) · Map (live emergencies) · Profile (station + account)
export default function AgencyTabLayout({ role }: { role: string }) {
  const theme = themeFor(role);

  return (
    <Tabs
      initialRouteName="map"
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: theme.color,
        tabBarInactiveTintColor: "#4B5563",
        tabBarLabelStyle: { fontSize: 12, fontWeight: "700" },
        tabBarStyle: { height: 64, paddingTop: 6, paddingBottom: 8 },
      }}
    >
      <Tabs.Screen
        name="reports"
        options={{
          title: role === "pharmacy" ? "Requests" : "Reports",
          tabBarIcon: tabIcon("warning", "warning-outline"),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: "Map",
          tabBarIcon: tabIcon("map", "map-outline"),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: "Profile",
          tabBarIcon: tabIcon("person-circle", "person-circle-outline"),
        }}
      />
    </Tabs>
  );
}
