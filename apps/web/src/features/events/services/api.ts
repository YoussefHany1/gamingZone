import { GamingEvent } from "@/types";

export const fetchGamingEvents = async (): Promise<GamingEvent[]> => {
  const SERVER_URL =
    process.env.NEXT_PUBLIC_SERVER_URL || "https://igdb-api-omega.vercel.app";

  const response = await fetch(`${SERVER_URL}/events`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const data = await response.json();
  return Array.isArray(data) ? data : [];
};

export const fetchEventDetails = async (id: string): Promise<GamingEvent | null> => {
  const SERVER_URL =
    process.env.NEXT_PUBLIC_SERVER_URL || "https://igdb-api-omega.vercel.app";

  try {
    const response = await fetch(`${SERVER_URL}/events`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    if (Array.isArray(data)) {
      return data.find((e: GamingEvent) => e.id.toString() === id) || null;
    }
    return null;
  } catch (error) {
    console.error("Error fetching event details:", error);
    return null;
  }
};
