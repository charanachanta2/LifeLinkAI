// Inter (the website's font) for every <Text> and <TextInput> in the app.
// Drop-in replacement for the react-native versions: same props, same refs.
// fontWeight in a style picks the matching Inter file, so no screen code changes.
import React from "react";
import {
  StyleSheet,
  Text as RNText,
  TextInput as RNTextInput,
  type TextInputProps,
  type TextProps,
} from "react-native";

export const INTER_FONTS = {
  Inter_400Regular: require("../assets/fonts/Inter_400Regular.ttf"),
  Inter_500Medium: require("../assets/fonts/Inter_500Medium.ttf"),
  Inter_600SemiBold: require("../assets/fonts/Inter_600SemiBold.ttf"),
  Inter_700Bold: require("../assets/fonts/Inter_700Bold.ttf"),
  Inter_800ExtraBold: require("../assets/fonts/Inter_800ExtraBold.ttf"),
};

const FAMILY: Record<string, string> = {
  "100": "Inter_400Regular",
  "200": "Inter_400Regular",
  "300": "Inter_400Regular",
  "400": "Inter_400Regular",
  normal: "Inter_400Regular",
  "500": "Inter_500Medium",
  "600": "Inter_600SemiBold",
  "700": "Inter_700Bold",
  bold: "Inter_700Bold",
  "800": "Inter_800ExtraBold",
  "900": "Inter_800ExtraBold",
};

function interStyle(style: unknown) {
  const flat = (StyleSheet.flatten(style as any) || {}) as { fontFamily?: string; fontWeight?: string | number };
  if (flat.fontFamily) return null; // someone picked a font on purpose
  const family = FAMILY[String(flat.fontWeight ?? "400")] ?? "Inter_400Regular";
  return { fontFamily: family, fontWeight: "normal" as const };
}

const TextImpl = React.forwardRef<RNText, TextProps>(function Text(props, ref) {
  const extra = interStyle(props.style);
  return <RNText ref={ref} {...props} style={extra ? [props.style, extra] : props.style} />;
});

const TextInputImpl = React.forwardRef<RNTextInput, TextInputProps>(function TextInput(props, ref) {
  const extra = interStyle(props.style);
  return <RNTextInput ref={ref} {...props} style={extra ? [props.style, extra] : props.style} />;
});

export const Text = TextImpl;
export type Text = RNText;
export const TextInput = TextInputImpl;
export type TextInput = RNTextInput;
