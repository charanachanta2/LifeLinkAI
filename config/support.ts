import { Platform } from "react-native";

// ============================================================
// LIFELINK SUPPORT SERVER
// ============================================================
// The support system (chatbot + live agent chat) is its own Node
// service (the `lifelink-support` project). It needs a host that keeps
// a long-running process, WebSockets and a persistent disk (Render,
// Railway, Fly.io, a VPS) - NOT Vercel, which is where the main
// backend lives.
//
// Set EXPO_PUBLIC_SUPPORT_URL in .env, or edit PRODUCTION_SUPPORT_URL.

const LOCAL_IP = "192.168.1.5"; // same machine as the main backend
const LOCAL_PORT = 3000;

const PRODUCTION_SUPPORT_URL = "https://REPLACE-WITH-YOUR-SUPPORT-HOST";

const USE_LOCAL_SUPPORT = false;

export const SUPPORT_URL: string =
  process.env.EXPO_PUBLIC_SUPPORT_URL ||
  (USE_LOCAL_SUPPORT
    ? Platform.select({
        web: `http://localhost:${LOCAL_PORT}`,
        default: `http://${LOCAL_IP}:${LOCAL_PORT}`,
      })!
    : PRODUCTION_SUPPORT_URL);

export const SUPPORT_CONFIGURED = !SUPPORT_URL.includes("REPLACE-WITH");

// Shown in the chat so nobody waits on a bot during a real emergency.
export const EMERGENCY_NUMBER = "112";
