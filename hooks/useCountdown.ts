import { useState, useEffect, useCallback } from "react";

// Custom hook for a countdown timer

// Types

export interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}
export type CountdownTarget = number | string;

// Constants

const MS = {
  DAY: 1000 * 60 * 60 * 24,
  HOUR: 1000 * 60 * 60,
  MINUTE: 1000 * 60,
  SECOND: 1000,
} as const;

// main
export const useCountdown = (
  targetDate: CountdownTarget | undefined | null,
  updateInterval: number = 1000
): TimeLeft | null => {
  const calculateTimeLeft = useCallback((): TimeLeft | null => {
    if (!targetDate) return null;

    // Handle Unix timestamps 
    const releaseDate: Date =
      typeof targetDate === "number"
        ? new Date(targetDate * 1000)
        : new Date(targetDate);

    const distance = releaseDate.getTime() - Date.now();

    // Return null for past dates
    if (distance < 0) return null;

    return {
      days: Math.floor(distance / MS.DAY),
      hours: Math.floor((distance % MS.DAY) / MS.HOUR),
      minutes: Math.floor((distance % MS.HOUR) / MS.MINUTE),
      seconds: Math.floor((distance % MS.MINUTE) / MS.SECOND),
    };
  }, [targetDate]);

  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(calculateTimeLeft);

  useEffect(() => {
    // Sync immediately when targetDate changes
    setTimeLeft(calculateTimeLeft());

    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, updateInterval);

    return () => clearInterval(interval);
  }, [calculateTimeLeft, updateInterval]);

  return timeLeft;
};

export default useCountdown;