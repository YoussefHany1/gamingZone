import { Linking } from "react-native";
import { logger } from "@/src/lib/logger";

/**
 * "Add to calendar" via a Google Calendar web link.
 *
 * Deliberately no native module (expo-calendar): the app ships prebuilt
 * binaries with custom config plugins, so any native calendar dependency/
 * permission would force a full EAS rebuild. Opening the calendar's own
 * template URL covers every device that has a browser — the web page then
 * drives Google Calendar (or offers to handle the event otherwise).
 */
const SESSION_DURATION_FALLBACK_MIN = 60;

/** `YYYYMMDDTHHMMSSZ` — the UTC format the calendar template link accepts. */
function toGoogleDate(timestamp: number): string {
  return new Date(timestamp)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

export type CalendarSession = {
  gameName: string;
  startsAt: number;
  durationMin?: number | null;
};

/** Builds a Google Calendar "event template" URL for a confirmed session. */
export function buildGoogleCalendarUrl(session: CalendarSession): string {
  const durationMin =
    typeof session.durationMin === "number" && session.durationMin > 0
      ? session.durationMin
      : SESSION_DURATION_FALLBACK_MIN;
  const dates = `${toGoogleDate(session.startsAt)}/${toGoogleDate(
    session.startsAt + durationMin * 60_000,
  )}`;
  // Built by hand — RN does not ship a global URLSearchParams.
  const query = [
    "action=TEMPLATE",
    `text=${encodeURIComponent(`${session.gameName} session`)}`,
    `dates=${encodeURIComponent(dates)}`,
    `details=${encodeURIComponent("Scheduled in GamingZone")}`,
  ].join("&");
  return `https://calendar.google.com/calendar/render?${query}`;
}

/**
 * Opens the calendar link for a confirmed session. Returns false when the
 * device refuses the navigation so the caller can surface an error toast.
 *
 * `openURL` is tried directly, without `canOpenURL`: on Android that check
 * only answers reliably if every browser app is declared in the manifest's
 * `<queries>` block, which would mean a rebuild — the same thing we avoid.
 */
export async function openSessionInCalendar(
  session: CalendarSession,
): Promise<boolean> {
  try {
    await Linking.openURL(buildGoogleCalendarUrl(session));
    return true;
  } catch (error) {
    logger.warn("[social] Calendar link failed to open", error);
    return false;
  }
}
