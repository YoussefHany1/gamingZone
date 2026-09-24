import { GamingEvent } from "@/types";
import { getServerApiUrl } from "@/lib/api-config";

export async function fetchGamingEvents(): Promise<GamingEvent[]> {
  try {
    const response = await fetch(`${getServerApiUrl()}/events`, {
      // Cache in Vercel Data Cache — revalidates at most once every 10 minutes
      next: { revalidate: 600 },
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
