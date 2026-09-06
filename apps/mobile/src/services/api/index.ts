/**
 * Barrel export for the API layer.
 *
 * Import API functions and the HTTP client from this single entry point:
 *
 * ```ts
 * import { fetchGameById, fetchPopularGames } from "@/src/services/api";
 * import apiClient from "@/src/services/api"; // default = raw Axios instance
 * ```
 */
export { default } from "./client";
export * from "./igdbApi";
export * from "./steamApi";
export * from "./cheapSharkApi";
