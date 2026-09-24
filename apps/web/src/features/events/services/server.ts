import "server-only";

import { cache } from "react";
import { GamingEvent } from "@/types";
import { fetchGamingEvents } from "./api";

/** Cached per-request so metadata + page rendering share one /events call. */
export const getCachedGamingEvents = cache(fetchGamingEvents);

export const getCachedEventDetails = cache(
  async (id: string): Promise<GamingEvent | null> => {
    try {
      const events = await getCachedGamingEvents();
      return events.find((e) => e.id.toString() === id) || null;
    } catch (error) {
      console.error("Error fetching event details:", error);
      return null;
    }
  },
);
