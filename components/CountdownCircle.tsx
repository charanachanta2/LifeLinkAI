import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";

interface CountdownCircleProps {
  seconds: number;
  totalSeconds: number;
}

const SIZE = 220;
const STROKE_WIDTH = 12;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function CountdownCircle({
  seconds,
  totalSeconds,
}: CountdownCircleProps) {
  const progress = seconds / totalSeconds;

  const strokeDashoffset =
    CIRCUMFERENCE - progress * CIRCUMFERENCE;

  return (
    <View style={styles.container}>
      <Svg width={SIZE} height={SIZE}>
        {/* Background Circle */}
        <Circle
          stroke="rgba(255,255,255,0.25)"
          fill="none"
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          strokeWidth={STROKE_WIDTH}
        />

        {/* Progress Circle */}
        <Circle
          stroke="#FFFFFF"
          fill="none"
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          strokeWidth={STROKE_WIDTH}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${SIZE / 2}, ${SIZE / 2}`}
        />
      </Svg>

      <View style={styles.textContainer}>
        <Text style={styles.number}>{seconds}</Text>
        <Text style={styles.label}>SECONDS</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SIZE,
    height: SIZE,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
  },

  textContainer: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },

  number: {
    fontSize: 64,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  label: {
    marginTop: 5,
    fontSize: 14,
    color: "#FFFFFF",
    letterSpacing: 2,
    fontWeight: "700",
  },
});