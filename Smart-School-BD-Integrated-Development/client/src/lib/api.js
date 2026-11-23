import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export const api = axios.create({
  baseURL,
  timeout: 20000,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("ssbd_access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshPromise = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config || {};
    const url = original.url || "";
    const isAuthEndpoint = /\/auth\/(login|refresh|logout)/.test(url);

    if (error.response?.status === 401 && !original._retry && !isAuthEndpoint) {
      original._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = api.post("/auth/refresh").finally(() => { refreshPromise = null; });
        }
        const { data } = await refreshPromise;
        const newToken = data?.data?.accessToken;
        if (!newToken) throw new Error("Refresh response did not include an access token");
        sessionStorage.setItem("ssbd_access_token", newToken);
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (refreshError) {
        sessionStorage.removeItem("ssbd_access_token");
        sessionStorage.removeItem("ssbd_user");
        sessionStorage.removeItem("ssbd_current_page");
        window.dispatchEvent(new Event("ssbd:auth-expired"));
        return Promise.reject(Object.assign(refreshError, {
          userMessage: "সেশন শেষ হয়েছে। অনুগ্রহ করে আবার লগইন করুন।",
        }));
      }
    }

    const message =
      error.response?.data?.message ||
      (error.code === "ECONNABORTED"
        ? "সার্ভার থেকে উত্তর পেতে দেরি হচ্ছে। আবার চেষ্টা করো।"
        : "সার্ভারের সঙ্গে সংযোগ করা যায়নি।");
    return Promise.reject(Object.assign(error, { userMessage: message }));
  }
);
