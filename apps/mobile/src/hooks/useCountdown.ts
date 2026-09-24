import { useState, useEffect } from "react";
import type { CountdownResult } from "@gaming-zone/core";
import { computeTimeLeft } from "@gaming-zone/utils";

// Countdown timer hook that ticks at a configurable interval.
// Returns null for past dates or when no target is provided.

export type TimeLeft = CountdownResult;
export type CountdownTarget = number | string;

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const LAST_MINUTE_MS = 60 * 1000;

/** Total milliseconds remaining, computed from a TimeLeft object. */
function totalMs(time: TimeLeft): number {
  return time.days * DAY_MS + time.hours * HOUR_MS + time.minutes * MINUTE_MS + time.seconds * 1000;
}

/**
 * Returns true only when a consumer actually needs a re-render for the new value:
 *  - values that land inside the final minute tick every second (so the ending
 *    countdown and "live" state transitions are accurate);
 *  - anything further out only re-renders on minute/hour/day boundaries.
 * This bails out of ~59 of every 60 ticks, which matters because EventCards
 * mounted on the always-visible Home screen were re-rendering every second.
 */
function shouldRender(prev: TimeLeft, next: TimeLeft): boolean {
  const ms = totalMs(next);
  const isLastMinute = ms < LAST_MINUTE_MS;
  if (isLastMinute) return prev.seconds !== next.seconds;
  return (
    prev.days !== next.days ||
    prev.hours !== next.hours ||
    prev.minutes !== next.minutes
  );
}

export const useCountdown = (
  targetDate: CountdownTarget | null | undefined,
  /** How often (ms) the timer evaluates. Default: 1 000 ms. */
  updateInterval: number = 1_000,
): TimeLeft | null => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(() =>
    targetDate != null ? computeTimeLeft(targetDate) : null,
  );

  useEffect(() => {
    if (targetDate == null) {
      setTimeLeft(null);
      return;
    }

    // Sync immediately when targetDate changes.
    setTimeLeft(computeTimeLeft(targetDate));

    const id = setInterval(() => {
      setTimeLeft((prev) => {
        const next = computeTimeLeft(targetDate);
        // Both null — nothing to show, skip the useless update.
        if (prev == null && next == null) return prev;
        // Countdown just expired — force one final render to null.
        if (next == null) return null;
        // No visible change — return the previous reference so React bails out
        // of the re-render entirely.
        if (prev != null && !shouldRender(prev, next)) return prev;
        return next;
      });
    }, updateInterval);

    return () => clearInterval(id);
  }, [targetDate, updateInterval]);

  return timeLeft;
};

export default useCountdown;
