import useSWR from "swr";
import { fetchGamingEvents } from "@/features/events";
import { useCountdown } from "@/hooks/useCountdown";
import { formatEventDateShort, getEventStatus } from "@gaming-zone/utils";
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
  const status = getEventStatus(item.start_time, item.end_time);

  const formatEventDate = (timestamp: number) =>
    formatEventDateShort(timestamp, lang);

  const countdown = useCountdown(status === "upcoming" ? item.start_time : null);

  return { status, formatEventDate, countdown };
}
