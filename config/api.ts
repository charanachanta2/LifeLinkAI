import { Platform } from "react-native";

// ============================================================
// LOCAL BACKEND CONFIG
// ============================================================

const LOCAL_IP = "192.168.1.5";
const LOCAL_PORT = 5000;

// ============================================================
// PRODUCTION BACKEND
// ============================================================

const PRODUCTION_URL =
  "https://lifelink-backend-neon.vercel.app";

// ============================================================
// BACKEND MODE
// ============================================================

// true  = local backend
// false = deployed Vercel backend

const USE_LOCAL_BACKEND = false;

// ============================================================
// BASE URL
// ============================================================

// EXPO_PUBLIC_API_URL in .env (if set) wins over everything below, so you can
// point the app at any backend without touching code.
export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL ||
  (USE_LOCAL_BACKEND
    ? Platform.select({
        web: `http://localhost:${LOCAL_PORT}`,
        default: `http://${LOCAL_IP}:${LOCAL_PORT}`,
      })!
    : PRODUCTION_URL)
).replace(/\/+$/, "");

// ============================================================
// API ENDPOINTS
// ============================================================

export const API = {
  // ==========================================================
  // AUTH
  // ==========================================================

  // Firebase handles sign-in on the device; this turns the Firebase ID
  // token into / loads the LifeLink profile (role, phone, donor info).
  sync: `${API_BASE_URL}/api/auth/sync`,

  me: `${API_BASE_URL}/api/auth/me`,

  // ==========================================================
  // PHONE
  // ==========================================================

  phone: `${API_BASE_URL}/api/auth/phone`,

  // ==========================================================
  // EMERGENCY
  // ==========================================================

  contacts: `${API_BASE_URL}/api/emergency/contacts`,

  // NEW
  alert: `${API_BASE_URL}/api/emergency/alert`,

  safe: (incidentId: string) =>
    `${API_BASE_URL}/api/emergency/${incidentId}/safe`,

  incident: (incidentId: string) =>
    `${API_BASE_URL}/api/emergency/incidents/${incidentId}`,

  nearby: (
    lat: number,
    lng: number,
    type: string,
    radius = 5000
  ) =>
    `${API_BASE_URL}/api/emergency/nearby?lat=${lat}&lng=${lng}&type=${type}&radius=${radius}`,

  place: (placeId: string) =>
    `${API_BASE_URL}/api/emergency/place/${placeId}`,

  // Nearby registered public-service accounts (police/hospital/
  // firestation/pharmacy) — LifeLink's own accounts, not Google Places.
  agenciesNearby: (
    lat: number,
    lng: number,
    role?: string,
    radius = 15
  ) =>
    `${API_BASE_URL}/api/emergency/agencies/nearby?lat=${lat}&lng=${lng}${
      role ? `&role=${role}` : ""
    }&radius=${radius}`,

  // ==========================================================
  // BLOOD BANK
  // ==========================================================

  bloodDonorRegister: `${API_BASE_URL}/api/bloodbank/donor`,

  bloodDonorAvailability: `${API_BASE_URL}/api/bloodbank/donor/availability`,

  bloodDonorsNearby: (
    lat: number,
    lng: number,
    bloodGroup?: string,
    radius = 15
  ) =>
    `${API_BASE_URL}/api/bloodbank/donors/nearby?lat=${lat}&lng=${lng}${
      bloodGroup ? `&bloodGroup=${bloodGroup}` : ""
    }&radius=${radius}`,

  bloodRequests: `${API_BASE_URL}/api/bloodbank/requests`,

  bloodRequestsNearby: (
    lat: number,
    lng: number,
    bloodGroup?: string,
    radius = 15
  ) =>
    `${API_BASE_URL}/api/bloodbank/requests/nearby?lat=${lat}&lng=${lng}${
      bloodGroup ? `&bloodGroup=${bloodGroup}` : ""
    }&radius=${radius}`,

  bloodRequestsMine: `${API_BASE_URL}/api/bloodbank/requests/mine`,

  bloodRequestFulfill: (id: string) =>
    `${API_BASE_URL}/api/bloodbank/requests/${id}/fulfill`,

  bloodRequestCancel: (id: string) =>
    `${API_BASE_URL}/api/bloodbank/requests/${id}/cancel`,

  // ==========================================================
  // HEALTH RECORDS
  // ==========================================================

  healthRecords: `${API_BASE_URL}/api/health/records`,

  healthReport: `${API_BASE_URL}/api/health/report`,

  healthRecord: (id: string) =>
    `${API_BASE_URL}/api/health/records/${id}`,

  healthRecordPdf: (id: string) =>
    `${API_BASE_URL}/api/health/records/${id}/pdf`,
};