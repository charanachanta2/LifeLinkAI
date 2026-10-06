import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Socket } from "socket.io-client";

import { themeFor } from "@/constants/agency";
import {
  EMERGENCY_NUMBER,
  SUPPORT_CONFIGURED,
} from "@/config/support";
import { useAuth } from "@/context/AuthContext";
import {
  askBot,
  clearSession,
  closeGuestChat,
  connectGuestSocket,
  loadGuestChat,
  readSession,
  requestPerson,
  saveSession,
  sendLiveMessage,
  type BotTurn,
  type GuestSession,
  type SupportMessage,
  type SupportTicket,
} from "@/utils/supportClient";

// ---------------------------------------------------------------------------
// LifeLink Support, inside the app.
//
//   1. Chat with the assistant (answers from the support FAQ).
//   2. If it can't help - or you ask - "Talk to a person" opens a live chat
//      with a support agent. Same screen, no browser, no website.
//
// Works for every account type (civilian, police, hospital, fire, pharmacy).
// ---------------------------------------------------------------------------

type Bubble = {
  key: string;
  kind: "me" | "bot" | "agent" | "system";
  text: string;
  sender?: string;
};

const TOPICS = [
  "How does SOS work?",
  "Crash & fall detection",
  "Blood Bank help",
  "Emergency contacts",
  "My account or role",
];

const WELCOME =
  "Hi! I'm the LifeLink assistant. Ask me anything about the app, or tap a topic below. If I can't solve it, I'll connect you to a person.";

const fromServer = (m: SupportMessage): Bubble => ({
  key: `s${m.id}`,
  kind:
    m.sender_type === "guest" || m.sender_type === "customer"
      ? "me"
      : m.sender_type === "agent"
      ? "agent"
      : m.sender_type === "system"
      ? "system"
      : "bot",
  text: m.content,
  sender: m.sender_name,
});

export default function SupportScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const isService =
    user?.role === "police" ||
    user?.role === "hospital" ||
    user?.role === "firestation" ||
    user?.role === "pharmacy";
  const accent = isService ? themeFor(user?.role).color : "#DC2626";
  const userId = user?.id || "anon";

  const scrollRef = useRef<ScrollView>(null);
  const socketRef = useRef<Socket | null>(null);
  const seen = useRef<Set<number>>(new Set());

  const [bubbles, setBubbles] = useState<Bubble[]>([
    { key: "welcome", kind: "bot", text: WELCOME },
  ]);
  const [history, setHistory] = useState<BotTurn[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [offerPerson, setOfferPerson] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const [session, setSession] = useState<GuestSession | null>(null);
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [online, setOnline] = useState(true);
  const [booting, setBooting] = useState(true);

  const live = !!session && ticket?.status !== "closed";

  const scrollDown = () =>
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);

  const addBubble = useCallback((b: Bubble) => {
    setBubbles((prev) => [...prev, b]);
    scrollDown();
  }, []);

  // Messages from the server arrive both from the REST load and the socket,
  // so they're de-duplicated by id.
  const addServerMessage = useCallback(
    (m: SupportMessage) => {
      if (seen.current.has(m.id)) return;
      seen.current.add(m.id);
      addBubble(fromServer(m));
    },
    [addBubble]
  );

  const disconnect = () => {
    socketRef.current?.removeAllListeners();
    socketRef.current?.disconnect();
    socketRef.current = null;
  };

  const startLive = useCallback(
    (s: GuestSession, initial: { ticket: SupportTicket; messages: SupportMessage[] }) => {
      disconnect();
      seen.current = new Set();
      setSession(s);
      setTicket(initial.ticket);
      initial.messages.forEach((m) => seen.current.add(m.id));
      setBubbles(initial.messages.map(fromServer));
      scrollDown();

      if (initial.ticket.status === "closed") return;

      const socket = connectGuestSocket(s.token);
      socketRef.current = socket;

      socket.on("connect", async () => {
        setOnline(true);
        // Catch up on anything missed while the connection was down.
        try {
          const fresh = await loadGuestChat(s.token);
          setTicket(fresh.ticket);
          fresh.messages.forEach(addServerMessage);
        } catch {
          /* the socket will deliver new messages anyway */
        }
      });
      socket.on("disconnect", () => setOnline(false));
      socket.on("connect_error", () => setOnline(false));
      socket.on("ticket_message", (m: SupportMessage) => addServerMessage(m));
      socket.on("ticket_update", (t: SupportTicket) => setTicket(t));
      socket.on("error_message", (e: { message?: string }) => {
        if (e?.message) addBubble({ key: `e${Date.now()}`, kind: "system", text: e.message });
      });
    },
    [addBubble, addServerMessage]
  );

  // Re-open an unfinished chat when the screen is opened again.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (SUPPORT_CONFIGURED) {
        const saved = await readSession(userId);
        if (saved) {
          try {
            const data = await loadGuestChat(saved.token);
            if (cancelled) return;
            if (data.ticket.status === "closed") {
              await clearSession(userId);
            } else {
              startLive(saved, data);
            }
          } catch (e: any) {
            // 404 = the chat no longer exists. Anything else = offline; keep it.
            if (e?.status === 404) await clearSession(userId);
          }
        }
      }
      if (!cancelled) setBooting(false);
    })();
    return () => {
      cancelled = true;
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // ---- bot ----------------------------------------------------------------

  const sendToBot = async (text: string) => {
    const clean = text.trim();
    if (!clean || thinking) return;

    setOfferPerson(false);
    addBubble({ key: `u${Date.now()}`, kind: "me", text: clean });
    setThinking(true);
    try {
      const r = await askBot(clean, history);
      setHistory((h) => [
        ...h,
        { role: "user", text: clean },
        { role: "bot", text: r.reply, fallback: r.fallback },
      ]);
      addBubble({ key: `b${Date.now()}`, kind: "bot", text: r.reply });
      if (r.escalate || r.fallback) setOfferPerson(true);
    } catch (e: any) {
      addBubble({
        key: `x${Date.now()}`,
        kind: "system",
        text: e?.message || "Something went wrong. Please try again.",
      });
    } finally {
      setThinking(false);
    }
  };

  // ---- hand-off to a person --------------------------------------------------

  const connectToPerson = async () => {
    if (connecting) return;
    setConnecting(true);
    setOfferPerson(false);
    try {
      // The support desk has no LifeLink account for the customer, so the
      // agent is told who is writing as the first line of the transcript.
      const who: BotTurn = {
        role: "user",
        text: `[Sent from the LifeLink app] ${user?.name || "Unknown"} · ${
          user?.email || "no email"
        } · account type: ${user?.role || "civilian"}${
          user?.orgName ? ` (${user.orgName})` : ""
        }`,
      };
      const r = await requestPerson(user?.name || "", [who, ...history]);
      const s: GuestSession = { token: r.guest_token, ticketId: r.ticket.id };
      await saveSession(userId, s);
      const data = await loadGuestChat(s.token);
      startLive(s, data);
    } catch (e: any) {
      addBubble({
        key: `x${Date.now()}`,
        kind: "system",
        text: e?.message || "Couldn't reach a person right now.",
      });
      setOfferPerson(true);
    } finally {
      setConnecting(false);
    }
  };

  // ---- live chat --------------------------------------------------------------

  const sendLive = async () => {
    const text = input.trim();
    if (!text || !socketRef.current) return;
    setInput("");
    try {
      await sendLiveMessage(socketRef.current, text);
    } catch (e: any) {
      setInput(text); // give the text back so nothing is lost
      Alert.alert("Not sent", e?.message || "Try again.");
    }
  };

  const endChat = () => {
    if (!session) return;
    Alert.alert("End this chat?", "You can start a new one any time.", [
      { text: "Keep chatting", style: "cancel" },
      {
        text: "End chat",
        style: "destructive",
        onPress: async () => {
          try {
            await closeGuestChat(session.token);
          } catch {
            /* closing again later is harmless */
          }
          await clearSession(userId);
          disconnect();
          setSession(null);
          setTicket(null);
          setHistory([]);
          seen.current = new Set();
          setBubbles([
            { key: "ended", kind: "system", text: "Chat ended. Thanks for contacting LifeLink." },
            { key: "welcome", kind: "bot", text: WELCOME },
          ]);
        },
      },
    ]);
  };

  const submit = () => {
    if (live) sendLive();
    else {
      const t = input;
      setInput("");
      sendToBot(t);
    }
  };

  // ---- render -----------------------------------------------------------------

  const statusLine = !live
    ? "Instant answers, or a real person"
    : ticket?.status === "pending"
    ? "Waiting for a team member…"
    : ticket?.agent_name
    ? `Chatting with ${ticket.agent_name}`
    : "Connected to support";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityLabel="Back"
          >
            <Ionicons name="chevron-back" size={26} color="#111827" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>LifeLink Support</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {statusLine}
            </Text>
          </View>
          {live ? (
            <TouchableOpacity onPress={endChat}>
              <Text style={[styles.headerAction, { color: "#B91C1C" }]}>End</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={connectToPerson} disabled={connecting || !SUPPORT_CONFIGURED}>
              <Text style={[styles.headerAction, { color: accent }]}>
                {connecting ? "Connecting…" : "Talk to a person"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Emergency banner - always visible */}
        <TouchableOpacity
          style={styles.emergency}
          onPress={() => Linking.openURL(`tel:${EMERGENCY_NUMBER}`)}
          accessibilityLabel={`Call emergency number ${EMERGENCY_NUMBER}`}
        >
          <Ionicons name="call" size={16} color="#fff" />
          <Text style={styles.emergencyText}>
            In an emergency, don't chat — tap to call {EMERGENCY_NUMBER}
          </Text>
        </TouchableOpacity>

        {!SUPPORT_CONFIGURED && (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              Support isn't connected yet. Set EXPO_PUBLIC_SUPPORT_URL (see
              config/support.ts).
            </Text>
          </View>
        )}
        {live && !online && (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              Connection lost — reconnecting. Your messages are saved.
            </Text>
          </View>
        )}

        {/* Messages */}
        {booting ? (
          <View style={styles.center}>
            <ActivityIndicator color={accent} />
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          >
            {bubbles.map((b) =>
              b.kind === "system" ? (
                <Text key={b.key} style={styles.systemText}>
                  {b.text}
                </Text>
              ) : (
                <View
                  key={b.key}
                  style={[
                    styles.bubble,
                    b.kind === "me"
                      ? [styles.me, { backgroundColor: accent }]
                      : styles.them,
                  ]}
                >
                  {b.kind === "agent" && !!b.sender && (
                    <Text style={styles.sender}>{b.sender}</Text>
                  )}
                  <Text style={[styles.bubbleText, b.kind === "me" && { color: "#fff" }]}>
                    {b.text}
                  </Text>
                </View>
              )
            )}

            {thinking && (
              <View style={[styles.bubble, styles.them]}>
                <ActivityIndicator size="small" color="#6B7280" />
              </View>
            )}

            {/* Topic chips: only before the first question */}
            {!live && history.length === 0 && !thinking && (
              <View style={styles.chips}>
                {TOPICS.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={styles.chip}
                    onPress={() => sendToBot(t)}
                    disabled={!SUPPORT_CONFIGURED}
                  >
                    <Text style={styles.chipText}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {offerPerson && !live && (
              <TouchableOpacity
                style={[styles.connectBtn, { backgroundColor: accent }]}
                onPress={connectToPerson}
                disabled={connecting}
              >
                <Ionicons name="person" size={16} color="#fff" />
                <Text style={styles.connectText}>Connect me to a person</Text>
              </TouchableOpacity>
            )}

            {ticket?.status === "closed" && (
              <Text style={styles.systemText}>This chat has ended.</Text>
            )}
          </ScrollView>
        )}

        {/* Composer */}
        <View style={styles.composer}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={live ? "Message support…" : "Type your question…"}
            placeholderTextColor="#9CA3AF"
            style={styles.input}
            maxLength={1000}
            multiline
            editable={SUPPORT_CONFIGURED}
          />
          <TouchableOpacity
            style={[
              styles.send,
              { backgroundColor: accent },
              (!input.trim() || !SUPPORT_CONFIGURED) && { opacity: 0.45 },
            ]}
            onPress={submit}
            disabled={!input.trim() || !SUPPORT_CONFIGURED}
            accessibilityLabel="Send"
          >
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F3F4F6" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  title: { fontSize: 17, fontWeight: "800", color: "#111827" },
  subtitle: { fontSize: 12, color: "#6B7280", marginTop: 1 },
  headerAction: { fontSize: 13, fontWeight: "700" },
  emergency: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#B91C1C",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  emergencyText: { color: "#fff", fontSize: 12.5, fontWeight: "700" },
  notice: { backgroundColor: "#FEF3C7", paddingVertical: 7, paddingHorizontal: 14 },
  noticeText: { color: "#92400E", fontSize: 12.5 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 14, gap: 8, flexGrow: 1 },
  bubble: { maxWidth: "84%", borderRadius: 16, paddingVertical: 9, paddingHorizontal: 13 },
  me: { alignSelf: "flex-end", borderBottomRightRadius: 4 },
  them: { alignSelf: "flex-start", backgroundColor: "#fff", borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 21, color: "#111827" },
  sender: { fontSize: 11, fontWeight: "800", color: "#6B7280", marginBottom: 2 },
  systemText: { textAlign: "center", color: "#6B7280", fontSize: 12.5, marginVertical: 4 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  chip: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 13,
  },
  chipText: { fontSize: 13.5, color: "#111827", fontWeight: "600" },
  connectBtn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  connectText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    padding: 10,
    backgroundColor: "#fff",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E7EB",
  },
  input: {
    flex: 1,
    maxHeight: 110,
    minHeight: 42,
    backgroundColor: "#F3F4F6",
    borderRadius: 21,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 12 : 8,
    paddingBottom: Platform.OS === "ios" ? 12 : 8,
    fontSize: 15,
    color: "#111827",
  },
  send: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
});
