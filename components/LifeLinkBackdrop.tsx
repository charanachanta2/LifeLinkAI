import Svg, { Circle, Defs, LinearGradient, RadialGradient, Rect, Stop, Path, G, Polygon } from "react-native-svg";
import { StyleSheet, View } from "react-native";

export default function LifeLinkBackdrop({ variant = "home" }: { variant?: "home" | "emergency" | "auth" }) {
  const emergency = variant === "emergency";
  const auth = variant === "auth";
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox="0 0 400 850" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="night" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={emergency ? "#120305" : "#0C0F0D"} />
            <Stop offset="0.46" stopColor={emergency ? "#2E1013" : "#0F2A1D"} />
            <Stop offset="1" stopColor="#050605" />
          </LinearGradient>
          <LinearGradient id="authBg" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#050605" />
            <Stop offset="0.55" stopColor="#0C0F0D" />
            <Stop offset="1" stopColor="#0F2A1D" />
          </LinearGradient>
          <LinearGradient id="sunset" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FF5A60" stopOpacity="0.95" />
            <Stop offset="1" stopColor="#F43F46" stopOpacity="0" />
          </LinearGradient>
          <RadialGradient id="redGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#F43F46" stopOpacity="0.58" />
            <Stop offset="1" stopColor="#F43F46" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="blueGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#1FE08A" stopOpacity="0.38" />
            <Stop offset="1" stopColor="#1FE08A" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="400" height="850" fill={auth ? "url(#authBg)" : "url(#night)"} />
        {auth ? (
          <>
            <Circle cx="320" cy="115" r="145" fill="#F43F46" opacity="0.08" />
            <Circle cx="40" cy="720" r="180" fill="#1FE08A" opacity="0.08" />
            <Path d="M-30 155 C 75 55, 145 210, 430 70" fill="none" stroke="#F43F46" strokeOpacity="0.12" strokeWidth="3" />
            <Path d="M-40 690 C 110 570, 190 790, 450 590" fill="none" stroke="#1FE08A" strokeOpacity="0.10" strokeWidth="4" />
            <Path d="M245 85 C 270 50, 300 45, 325 70 C 350 95, 335 130, 295 154 C 255 130, 230 110, 245 85Z" fill="#F43F46" opacity="0.10" />
          </>
        ) : (
          <>
            <Circle cx="338" cy="105" r="170" fill="url(#redGlow)" />
            <Circle cx="42" cy="330" r="190" fill="url(#blueGlow)" />
            <Circle cx="350" cy="690" r="150" fill="url(#redGlow)" opacity="0.5" />
            <Path d="M-20 175 C 70 95, 155 230, 430 90" fill="none" stroke="#C8F7E1" strokeOpacity="0.11" strokeWidth="1.5" />
            <Path d="M-40 630 C 100 530, 190 760, 450 560" fill="none" stroke="#FF3B60" strokeOpacity="0.12" strokeWidth="2" />
            {!emergency && (
              <>
                <Circle cx="200" cy="180" r="95" fill="url(#sunset)" opacity="0.22" />
                <G opacity="0.72">
                  <Polygon points="0,520 0,420 28,420 28,390 55,390 55,450 78,450 78,350 104,350 104,470 128,470 128,315 160,315 160,445 190,445 190,380 215,380 215,460 246,460 246,335 278,335 278,425 305,425 305,300 338,300 338,440 370,440 370,370 400,370 400,520" fill="#050605" />
                  <Path d="M0 520 C 90 500, 120 540, 205 515 C 285 492, 335 520, 400 500 L400 850 L0 850 Z" fill="#030403" />
                  <Path d="M0 560 L400 560" stroke="#F43F46" strokeOpacity="0.08" strokeWidth="2" />
                </G>
                <G opacity="0.7">
                  <Circle cx="38" cy="442" r="2" fill="#F43F46" /><Circle cx="102" cy="412" r="2" fill="#FFD166" />
                  <Circle cx="160" cy="375" r="2" fill="#F43F46" /><Circle cx="246" cy="390" r="2" fill="#1FE08A" />
                  <Circle cx="305" cy="352" r="2" fill="#F43F46" /><Circle cx="366" cy="418" r="2" fill="#FFD166" />
                </G>
              </>
            )}
          </>
        )}
      </Svg>
    </View>
  );
}
