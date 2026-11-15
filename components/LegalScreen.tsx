import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Text } from "@/components/ll-text";
import { SafeAreaView } from "react-native-safe-area-context";

import { LEGAL_LAST_UPDATED, type LegalSection } from "@/constants/legal";
import { LL } from "@/constants/lifelink-theme";

type Props = {
  title: string;
  intro?: string;
  sections: LegalSection[];
};

// Simple reader for the Privacy Policy / Terms. Lines that start with
// "• " are drawn as bullets with a hanging indent so they wrap neatly.
export default function LegalScreen({ title, intro, sections }: Props) {
  const router = useRouter();

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={goBack}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={26} color={LL.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.updated}>Last updated: {LEGAL_LAST_UPDATED}</Text>

        {intro ? <Text style={styles.intro}>{intro}</Text> : null}

        {sections.map((section) => (
          <View key={section.heading} style={styles.section}>
            <Text style={styles.heading}>{section.heading}</Text>

            {section.body.map((line, index) => {
              const isBullet = line.startsWith("• ");

              return isBullet ? (
                <View key={index} style={styles.bulletRow}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.bulletText}>{line.slice(2)}</Text>
                </View>
              ) : (
                <Text key={index} style={styles.paragraph}>
                  {line}
                </Text>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "transparent" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: LL.border,
  },
  backButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "800", color: LL.text },
  content: { padding: 20, paddingBottom: 48 },
  updated: { fontSize: 12.5, color: LL.textMuted, marginBottom: 14 },
  intro: { fontSize: 14.5, lineHeight: 22, color: LL.textSoft, marginBottom: 8 },
  section: { marginTop: 20 },
  heading: { fontSize: 16, fontWeight: "800", color: LL.text, marginBottom: 8 },
  paragraph: { fontSize: 14.5, lineHeight: 22, color: LL.textSoft, marginBottom: 8 },
  bulletRow: { flexDirection: "row", marginBottom: 6, paddingRight: 4 },
  bullet: { width: 18, fontSize: 14.5, lineHeight: 22, color: LL.dangerText, fontWeight: "900" },
  bulletText: { flex: 1, fontSize: 14.5, lineHeight: 22, color: LL.textSoft },
});
