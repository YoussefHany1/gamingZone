import { useState, useEffect } from "react";

// Countdown timer hook that ticks at a configurable interval.
// Returns null for past dates or when no target is provided.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export type CountdownTarget = number | string;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MS_PER = {
  DAY: 1_000 * 60 * 60 * 24,
  HOUR: 1_000 * 60 * 60,
  MINUTE: 1_000 * 60,
  SECOND: 1_000,
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveDate(target: CountdownTarget): Date {
  // Treat numeric targets as Unix timestamps (seconds → ms)
  return typeof target === "number"
    ? new Date(target * 1_000)
    : new Date(target);
}

function computeTimeLeft(target: CountdownTarget): TimeLeft | null {
  const distance = resolveDate(target).getTime() - Date.now();
  if (distance <= 0) return null;

  return {
    days: Math.floor(distance / MS_PER.DAY),
    hours: Math.floor((distance % MS_PER.DAY) / MS_PER.HOUR),
    minutes: Math.floor((distance % MS_PER.HOUR) / MS_PER.MINUTE),
    seconds: Math.floor((distance % MS_PER.MINUTE) / MS_PER.SECOND),
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export const useCountdown = (
  targetDate: CountdownTarget | null | undefined,
  /** How often (ms) the timer ticks. Default: 1 000 ms. */
  updateInterval: number = 1_000
): TimeLeft | null => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(() =>
    targetDate != null ? computeTimeLeft(targetDate) : null
  );

  useEffect(() => {
    if (targetDate == null) {
      setTimeLeft(null);
      return;
    }

    // Sync immediately when targetDate changes.
    setTimeLeft(computeTimeLeft(targetDate));

    const id = setInterval(() => {
      setTimeLeft(computeTimeLeft(targetDate));
    }, updateInterval);

    return () => clearInterval(id);
  }, [targetDate, updateInterval]);

  return timeLeft;
};

export default useCountdown;