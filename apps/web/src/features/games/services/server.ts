import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { getServerApiUrl } from "@/lib/api-config";
import type { Game } from "../types";

const CACHE_VERSION = "v2";

async function fetchLatestTrailersUncached(): Promise<Game[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(`${getServerApiUrl()}/latest-trailers`, {
      signal: controller.signal,
      cache: "no-store",
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    console.warn("Failed to fetch latest trailers (network error or proxy down).");
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Latest game trailers for the home slideshow. */
export const fetchLatestTrailers = cache(
  unstable_cache(
    fetchLatestTrailersUncached,
    [CACHE_VERSION, "latest-trailers"],
    { revalidate: 3600, tags: ["events"] },
  ),
);
