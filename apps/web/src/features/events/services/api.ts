import { GamingEvent } from "@/types";
import { getServerApiUrl } from "@/lib/api-config";

export async function fetchGamingEvents(): Promise<GamingEvent[]> {
  try {
    const response = await fetch(`${getServerApiUrl()}/events`, {
      // Cache in Vercel Data Cache. Must be raised in step with the events/[id]
      // segment `revalidate` (also 86400) — Next takes a route's window from the
      // lowest TTL among the entries its render touches, so moving one without
      // the other leaves both at the lower value.
      //
      // This is a backstop, not the freshness mechanism: free-games.yml calls
      // /api/revalidate with target "events" hourly, which drops this tag and
      // revalidates the home pages carrying the event carousel. Without that
      // trigger nothing would expire this tag and event data would go stale for
      // the full window.
      next: { revalidate: 86400, tags: ["events"] },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    // Fail open (empty list) so the home page and event pages don't crash when
    // the backend proxy is unreachable; ISR will recover on the next revalidate.
    console.error("Error fetching gaming events:", error);
    return [];
  }
}

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
