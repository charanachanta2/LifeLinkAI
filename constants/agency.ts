// Shared look + labels for public-service (agency) accounts.

export type AgencyRoleKey = "police" | "hospital" | "firestation" | "pharmacy";

export const AGENCY_THEME: Record<
  AgencyRoleKey,
  { label: string; color: string; soft: string; emoji: string }
> = {
  police: { label: "Police Station", color: "#1D4ED8", soft: "#DBEAFE", emoji: "🚓" },
  hospital: { label: "Hospital", color: "#DC2626", soft: "#FEE2E2", emoji: "🏥" },
  firestation: { label: "Fire Station", color: "#EA580C", soft: "#FFEDD5", emoji: "🚒" },
  pharmacy: { label: "Pharmacy", color: "#15803D", soft: "#DCFCE7", emoji: "💊" },
};

export const themeFor = (role?: string) =>
  AGENCY_THEME[(role as AgencyRoleKey) || "police"] ?? AGENCY_THEME.police;

// Glyph drawn inside the pin for each kind of emergency.
export const EMERGENCY_EMOJI: Record<string, string> = {
  SOS: "🆘",
  CRASH: "🚗",
  FALL: "🤕",
  MEDICAL: "🩺",
};

export const EMERGENCY_LABEL: Record<string, string> = {
  SOS: "SOS alert",
  CRASH: "Crash detected",
  FALL: "Fall detected",
  MEDICAL: "Medical emergency",
};

export const ACTIVE_STATUSES = ["PENDING", "DISPATCHED", "ACCEPTED"];

// Great-circle distance in km.
export function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}
