import AsyncStorage from "@react-native-async-storage/async-storage";

// Tiny persistent log so you can see what background detection did even when
// Metro/console output isn't available (app in background, standalone build).
const KEY = "lifelink_detection_log";
const MAX = 300;

let lines: string[] = [];
let loaded = false;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

async function load() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const old: string[] = raw ? JSON.parse(raw) : [];
    lines = [...old, ...lines].slice(-MAX);
  } catch {}
}

async function saveNow() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(lines));
  } catch {}
}

function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(async () => {
    saveTimer = null;
    try {
      await AsyncStorage.setItem(KEY, JSON.stringify(lines));
    } catch {}
  }, 1500);
}

const stamp = () => new Date().toLocaleTimeString("en-GB");

export function dlog(message: string) {
  console.log(message);
  lines.push(`${stamp()}  ${message}`);
  if (lines.length > MAX) lines = lines.slice(-MAX);
  // Crash / alert lines are written straight away, so they survive even if the
  // app is killed a moment later. Routine lines are batched.
  const important = /^(🚨|🆘|✅|❌|⏱️|👍)/u.test(message);
  load().then(important ? saveNow : scheduleSave);
}

export async function getDetectionLog(): Promise<string[]> {
  await load();
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const stored: string[] = raw ? JSON.parse(raw) : [];
    // in-memory lines are the newest; merge without duplicates
    const merged = Array.from(new Set([...stored, ...lines]));
    return merged.slice(-MAX);
  } catch {
    return lines.slice(-MAX);
  }
}

export async function clearDetectionLog() {
  lines = [];
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {}
}
