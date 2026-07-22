import { Platform } from "react-native";

const LOCAL_IP = "192.168.1.5";
const LOCAL_PORT = 5000;
const PRODUCTION_URL = "https://lifelink-backend-neon.vercel.app";

// 👇 Flip this manually when you want to test against your local backend
const USE_LOCAL_BACKEND = false;

export const API_BASE_URL = USE_LOCAL_BACKEND
  ? Platform.select({
      web: `http://localhost:${LOCAL_PORT}`,
      default: `http://${LOCAL_IP}:${LOCAL_PORT}`,
    })
  : PRODUCTION_URL;

export const API = {
  sendOtp: `${API_BASE_URL}/api/auth/send-otp`,
  register: `${API_BASE_URL}/api/auth/register`,
  login: `${API_BASE_URL}/api/auth/login`,
  googleLogin: `${API_BASE_URL}/api/auth/google-login`,
  me: `${API_BASE_URL}/api/auth/me`,
  verifyPhone: `${API_BASE_URL}/api/auth/verify-phone`,
  contacts: `${API_BASE_URL}/api/emergency/contacts`,
};