import "server-only";

import { cache } from "react";
import { getServerApiUrl } from "@/lib/api-config";
import type { Game } from "../types";

/** Latest game trailers for the home slideshow (cached per request/render). */
export const fetchLatestTrailers = cache(async (): Promise<Game[]> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(`${getServerApiUrl()}/latest-trailers`, {
      signal: controller.signal,
      // Cache in Vercel Data Cache — revalidates at most once every 10 minutes
      next: { revalidate: 600 },
    });

    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    console.warn("Failed to fetch latest trailers (network error or proxy down).");
    return [];
  }
});
