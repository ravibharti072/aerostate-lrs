import axios from "axios";

// Automatically uses .env.development in dev, and .env.production in build
const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:8000" : "http://43.204.222.227:8000");

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  withCredentials: true,
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
    const requestUrl = error?.config?.url || "";

    const isLoginEndpoint =
      requestUrl.includes("/token") ||
      requestUrl.includes("/login") ||
      requestUrl.includes("/auth");

    if (error?.response?.status === 401 && !isLoginEndpoint) {
      console.warn("Session expired (401). Clearing stored tokens.");
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