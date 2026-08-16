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

export const API_BASE_URL = USE_LOCAL_BACKEND
  ? Platform.select({
      web: `http://localhost:${LOCAL_PORT}`,
      default: `http://${LOCAL_IP}:${LOCAL_PORT}`,
    })!
  : PRODUCTION_URL;

// ============================================================
// API ENDPOINTS
// ============================================================

export const API = {
  // ==========================================================
  // AUTH
  // ==========================================================

  sendOtp: `${API_BASE_URL}/api/auth/send-otp`,

  register: `${API_BASE_URL}/api/auth/register`,

  login: `${API_BASE_URL}/api/auth/login`,

  googleLogin: `${API_BASE_URL}/api/auth/google-login`,

  me: `${API_BASE_URL}/api/auth/me`,

  // ==========================================================
  // PHONE
  // ==========================================================

  phone: `${API_BASE_URL}/api/auth/phone`,

  verifyPhone: `${API_BASE_URL}/api/auth/verify-phone`,

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