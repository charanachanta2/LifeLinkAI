// The soft green glow at the top of every dark page on the LifeLink website.
import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";

// Wraps a whole screen: solid black + the glow behind it.
export const withGlow = ({ children }: { children: React.ReactNode }) => (
  <View style={{ flex: 1, backgroundColor: "#050605" }}>
    <LLGlow />
    {children}
  </View>
);

export default function LLGlow() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id="llTop" cx="50%" cy="0%" rx="95%" ry="34%" gradientUnits="objectBoundingBox">
            <Stop offset="0" stopColor="#1FE08A" stopOpacity="0.16" />
            <Stop offset="1" stopColor="#1FE08A" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="llBottom" cx="100%" cy="100%" rx="70%" ry="30%" gradientUnits="objectBoundingBox">
            <Stop offset="0" stopColor="#F43F46" stopOpacity="0.07" />
            <Stop offset="1" stopColor="#F43F46" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#llTop)" />
        <Rect width="100%" height="100%" fill="url(#llBottom)" />
      </Svg>
    </View>
  );
}
