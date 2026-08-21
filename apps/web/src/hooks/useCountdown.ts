import { useEffect, useState } from "react";

import { computeTimeLeft } from "@gaming-zone/utils";
import type { CountdownResult } from "./types";

export function useCountdown(
  targetTimestamp: number | null,
): CountdownResult | null {
  const [timeLeft, setTimeLeft] = useState<CountdownResult | null>(null);

  useEffect(() => {
    const target = targetTimestamp;
    if (target === null) {
      setTimeLeft(null);
      return;
    }

    const calculateTime = (): CountdownResult => {
      return (
        computeTimeLeft(target) ?? {
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
        }
      );
    };

    setTimeLeft(calculateTime());

    const interval = setInterval(() => {
      setTimeLeft(calculateTime());
      if (computeTimeLeft(target) === null) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetTimestamp]);

  return timeLeft;
}
