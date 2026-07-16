import useSWR from "swr";
import { fetchGamingEvents } from "@/features/events";
import { useCountdown } from "@/hooks/useCountdown";
import { GamingEvent } from "@/types";

export function useGamingEvents(initialEvents?: GamingEvent[]) {
  const {
    data: events = initialEvents || [],
    error,
    isLoading: loading,
  } = useSWR<GamingEvent[]>("gaming-events", fetchGamingEvents, {
    fallbackData: initialEvents,
    onError: (err) => {
      console.warn("Failed to fetch events (network error or proxy down).", err);
    },
  });

  return { events, loading: !initialEvents && loading, error };
}

export function useEventCard(item: GamingEvent, lang: string) {
  const now = Date.now() / 1000;
  let status: "upcoming" | "live" | "ended" = "ended";
  
  if (now < item.start_time) status = "upcoming";
  else if (now >= item.start_time && now <= item.end_time) status = "live";

  const formatEventDate = (timestamp: number) => {
    if (!timestamp) return "";
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const countdown = useCountdown(status === "upcoming" ? item.start_time : null);

  return { status, formatEventDate, countdown };
}
