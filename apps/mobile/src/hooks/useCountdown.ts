import { useState, useEffect } from "react";
import type { CountdownResult } from "@gaming-zone/core";
import { computeTimeLeft } from "@gaming-zone/utils";

// Countdown timer hook that ticks at a configurable interval.
// Returns null for past dates or when no target is provided.

export type TimeLeft = CountdownResult;
export type CountdownTarget = number | string;

export const useCountdown = (
  targetDate: CountdownTarget | null | undefined,
  /** How often (ms) the timer ticks. Default: 1 000 ms. */
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
      setTimeLeft(computeTimeLeft(targetDate));
    }, updateInterval);

    return () => clearInterval(id);
  }, [targetDate, updateInterval]);

  return timeLeft;
};

export default useCountdown;
