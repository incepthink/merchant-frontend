import axios from "axios";
import Cookies from "js-cookie";

export const backendUrl =
  process.env.NODE_ENV === "production"
    ? "https://api.hashcase.co"
    : "http://localhost:8001";
const apiKey =
  process.env.NODE_ENV === "production"
    ? process.env.NEXT_PUBLIC_MERCHANT_API_KEY
    : process.env.NEXT_PUBLIC_MERCHANT_API_KEY_DEV;

const axiosInstance = axios.create({
  baseURL: backendUrl, // Set your API base URL her
  headers: {
    "x-api-key": apiKey,
  },
});

axiosInstance.interceptors.request.use((config) => {
  const token = Cookies.get("jwt");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url ?? "";
    if (error.response?.status === 401 && requestUrl.startsWith("/user/merchant/order") && typeof window !== "undefined") {
      ["owner_id", "owner_cap_id", "jwt", "api_key", "merchant_user"].forEach((key) => Cookies.remove(key));
      window.location.assign("/login");
    }
    return Promise.reject(error);
  },
);

export default axiosInstance;
