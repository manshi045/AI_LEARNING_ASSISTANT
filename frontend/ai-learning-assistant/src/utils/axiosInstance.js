import axios from "axios";

const resolvedBaseUrl =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? "http://127.0.0.1:8000/api" : "/api");

const axiosInstance = axios.create({
  baseURL: resolvedBaseUrl,
  timeout: 30000,
});

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("aila_auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      (Array.isArray(error?.response?.data?.message)
        ? error.response.data.message.join(", ")
        : null) ||
      error.message ||
      "Request failed";

    return Promise.reject(new Error(message));
  },
);

export default axiosInstance;
