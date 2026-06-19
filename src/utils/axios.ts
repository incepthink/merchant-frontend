import axios from "axios";

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

export default axiosInstance;
