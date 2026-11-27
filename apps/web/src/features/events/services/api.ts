import { unstable_cache } from "next/cache";
import { GamingEvent } from "@/types";
import { getServerApiUrl } from "@/lib/api-config";

const CACHE_VERSION = "v2";

async function fetchGamingEventsUncached(): Promise<GamingEvent[]> {
  try {
    const response = await fetch(`${getServerApiUrl()}/events`, {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error fetching gaming events:", error);
    return [];
  }
}

export const fetchGamingEvents = unstable_cache(
  fetchGamingEventsUncached,
  [CACHE_VERSION, "gaming-events"],
  { revalidate: 86400, tags: ["events"] },
);

export async function fetchEventDetails(
  id: string,
): Promise<GamingEvent | null> {
  try {
    const events = await fetchGamingEvents();
    return events.find((e) => e.id.toString() === id) || null;
  } catch (error) {
    console.error("Error fetching event details:", error);
    return null;
  }
}
