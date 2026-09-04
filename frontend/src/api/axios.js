import axios from "axios";

// Fallback directly to port 8000 if VITE_API_URL is missing
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  withCredentials: true, // Ensures cookies/session headers are sent correctly
});

api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("aerostate_loyalty_token") ||
      localStorage.getItem("token") ||
      localStorage.getItem("access_token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only clear storage on 401 if it's a genuine expired token, 
    // preventing aggressive loops if an endpoint fails due to CORS/Network errors
    if (error?.response?.status === 401) {
      console.warn("Unauthorized request (401). Clearing session tokens.");
      localStorage.removeItem("aerostate_loyalty_token");
      localStorage.removeItem("aerostate_loyalty_user");
      localStorage.removeItem("token");
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
      localStorage.removeItem("username");
      localStorage.removeItem("user_id");
    }

    return Promise.reject(error);
  }
);

export default api;