import * as SecureStore from "expo-secure-store";
import { io, type Socket } from "socket.io-client";

import { SUPPORT_URL } from "@/config/support";

// ---- Types (mirror lifelink-support's API) ---------------------------------

export type BotTurn = { role: "user" | "bot"; text: string; fallback?: boolean };

export type BotReply = { reply: string; escalate: boolean; fallback: boolean };

export type SupportTicket = {
  id: number;
  status: "pending" | "claimed" | "closed";
  agent_name: string | null;
  customer_name: string;
};

export type SupportMessage = {
  id: number;
  ticket_id: number;
  sender_type: "customer" | "guest" | "agent" | "bot" | "system";
  sender_name: string;
  content: string;
};

export type GuestSession = { token: string; ticketId: number };

// ---- REST ------------------------------------------------------------------

async function request<T>(
  path: string,
  init?: { method?: string; body?: unknown }
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(`${SUPPORT_URL}${path}`, {
      method: init?.method ?? "GET",
      headers: { "Content-Type": "application/json" },
      body: init?.body ? JSON.stringify(init.body) : undefined,
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err: any = new Error(data?.error || "Support is unavailable right now.");
      err.status = res.status;
      throw err;
    }
    return data as T;
  } catch (e: any) {
    if (e?.name === "AbortError") {
      throw new Error("Support took too long to respond. Check your connection.");
    }
    if (e?.status) throw e;
    throw new Error("Couldn't reach LifeLink Support. Check your connection.");
  } finally {
    clearTimeout(timer);
  }
}

export const askBot = (message: string, history: BotTurn[]) =>
  request<BotReply>("/api/bot/message", {
    method: "POST",
    body: { message, history: history.slice(-12) },
  });

export const requestPerson = (name: string, transcript: BotTurn[]) =>
  request<{ ticket: SupportTicket; guest_token: string }>("/api/bot/escalate", {
    method: "POST",
    body: { name, transcript: transcript.slice(-20) },
  });

export const loadGuestChat = (token: string) =>
  request<{ ticket: SupportTicket; messages: SupportMessage[] }>(
    `/api/guest/${token}`
  );

export const closeGuestChat = (token: string) =>
  request<SupportTicket>(`/api/guest/${token}/close`, { method: "POST" });

// ---- Remember the open chat so it survives leaving the screen --------------

const sessionKey = (userId: string) => `lifelink_support_${userId}`;

export async function readSession(userId: string): Promise<GuestSession | null> {
  try {
    const raw = await SecureStore.getItemAsync(sessionKey(userId));
    return raw ? (JSON.parse(raw) as GuestSession) : null;
  } catch {
    return null;
  }
}

export const saveSession = (userId: string, s: GuestSession) =>
  SecureStore.setItemAsync(sessionKey(userId), JSON.stringify(s)).catch(() => {});

export const clearSession = (userId: string) =>
  SecureStore.deleteItemAsync(sessionKey(userId)).catch(() => {});

// ---- Live socket -----------------------------------------------------------

export function connectGuestSocket(token: string): Socket {
  return io(SUPPORT_URL, {
    auth: { guestToken: token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 8000,
  });
}

export function sendLiveMessage(socket: Socket, msg: string): Promise<void> {
  return new Promise((resolve, reject) => {
    socket.timeout(8000).emit("ticket_message", { msg }, (err: unknown, res: any) => {
      if (err) return reject(new Error("Message not delivered. Try again."));
      if (res && res.ok === false) return reject(new Error(res.error || "Message not delivered."));
      resolve();
    });
  });
}
