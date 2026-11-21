import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export const api = axios.create({
  baseURL,
  timeout: 20000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("ssbd_access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      (error.code === "ECONNABORTED"
        ? "সার্ভার থেকে উত্তর পেতে দেরি হচ্ছে। আবার চেষ্টা করো।"
        : "সার্ভারের সঙ্গে সংযোগ করা যায়নি।");
    return Promise.reject(Object.assign(error, { userMessage: message }));
  }
);
