/**
 * Centralized Axios HTTP client for the GamingZone app.
 *
 * All API requests should go through this instance to benefit from:
 * - A consistent base URL (from constants/config)
 * - Unified timeout policy
 * - Request/response interceptors for logging and error normalisation
 */
import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from "axios";
import { SERVER_URL } from "@/src/constants/config";

// ─── Instance ─────────────────────────────────────────────────────────────────

const apiClient = axios.create({
  baseURL: SERVER_URL,
  timeout: 10_000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// ─── Request interceptor ──────────────────────────────────────────────────────

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => config,
  (error: AxiosError) => Promise.reject(error),
);

// ─── Response interceptor ─────────────────────────────────────────────────────

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response) {
      // The server responded with a status code outside 2xx
      const status = error.response.status;
      const message = `Server error ${status}: ${error.config?.url ?? "unknown endpoint"}`;
      return Promise.reject(new Error(message));
    }

    if (error.request) {
      // The request was made but no response was received (network issue)
      return Promise.reject(new Error("Network error — check your connection."));
    }

    // Something else triggered the error
    return Promise.reject(error);
  },
);

export default apiClient;
