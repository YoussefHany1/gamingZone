import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { formatEventDate, getEventStatus, igdbImageUrl } from "@gaming-zone/utils";
import type { EventStatus } from "@gaming-zone/utils";
import { useCountdown } from "@/src/hooks/useCountdown";
import { openLink } from "@/src/lib/browser";
import type { CountdownResult, GamingEvent } from "@/src/types/sharedTypes";

export type UseEventDetailsParams = {
  event: GamingEvent;
  navigation: { goBack: () => void };
};

export type UseEventDetailsResult = {
  status: EventStatus;
  /** Live countdown while the event is upcoming; null otherwise. */
  timeUntil: CountdownResult | null;
  logoUri: string | null;
  startDateStr: string;
  endDateStr: string;
  handleGoBack: () => void;
  handleStream: () => void;
};

/**
 * Derives everything the event details screen renders from the raw event:
 * status, countdown, hero image URL, formatted dates, and the back/stream
 * handlers.
 */
export function useEventDetails({
  event,
  navigation,
}: UseEventDetailsParams): UseEventDetailsResult {
  const { i18n } = useTranslation();

  const status = useMemo(
    () => getEventStatus(event.start_time, event.end_time),
    [event.start_time, event.end_time],
  );

  const timeUntil = useCountdown(status === "upcoming" ? event.start_time : null);

  const logoUri = event.event_logo
    ? igdbImageUrl(event.event_logo.image_id, "screenshot_big")
    : null;

  const startDateStr = useMemo(
    () => formatEventDate(event.start_time, i18n.language),
    [event.start_time, i18n.language],
  );
  const endDateStr = useMemo(
    () => formatEventDate(event.end_time, i18n.language),
    [event.end_time, i18n.language],
  );

  const handleGoBack = useCallback(() => navigation.goBack(), [navigation]);

  const handleStream = useCallback(() => {
    if (event.live_stream_url) {
      openLink(event.live_stream_url);
    }
  }, [event.live_stream_url]);

  return {
    status,
    timeUntil,
    logoUri,
    startDateStr,
    endDateStr,
    handleGoBack,
    handleStream,
  };
}
