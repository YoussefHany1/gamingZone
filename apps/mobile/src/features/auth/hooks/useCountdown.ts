import { useCallback, useEffect, useRef, useState } from "react";

export type UseCountdownResult = {
  /** Seconds remaining; `0` means the countdown is finished/inactive. */
  remaining: number;
  /** Convenience flag: `remaining > 0`. */
  isActive: boolean;
  /** Starts (or restarts) the countdown from `seconds`. */
  start: (seconds: number) => void;
};

/**
 * Simple seconds countdown for rate-limiting UI actions
 * (e.g. the "Resend verification email" cooldown).
 *
 * The interval is torn down when the count reaches zero or the component
 * unmounts, so no timers leak.
 */
export function useCountdown(): UseCountdownResult {
  const [remaining, setRemaining] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback((): void => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(
    (seconds: number): void => {
      if (seconds <= 0) return;
      stop();
      setRemaining(seconds);
      intervalRef.current = setInterval(() => {
        setRemaining((value) => {
          if (value <= 1) {
            stop();
            return 0;
          }
          return value - 1;
        });
      }, 1000);
    },
    [stop],
  );

  useEffect(() => stop, [stop]);

  return { remaining, isActive: remaining > 0, start };
}
