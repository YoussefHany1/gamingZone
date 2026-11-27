import { useEffect, useState } from "react";

import { computeTimeLeft } from "@gaming-zone/utils";
import type { CountdownResult } from "./types";

const ZERO_TIME_LEFT: CountdownResult = {
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0,
};

function compute(target: number): CountdownResult {
  return computeTimeLeft(target) ?? ZERO_TIME_LEFT;
}

export function useCountdown(
  targetTimestamp: number | null,
): CountdownResult | null {
  const [timeLeft, setTimeLeft] = useState<CountdownResult | null>(null);
  const [prevTarget, setPrevTarget] = useState(targetTimestamp);

  if (prevTarget !== targetTimestamp) {
    setPrevTarget(targetTimestamp);
    setTimeLeft(null);
  }

  useEffect(() => {
    if (targetTimestamp === null) return;

    const interval = setInterval(
      () => setTimeLeft(compute(targetTimestamp)),
      1000,
    );
    return () => clearInterval(interval);
  }, [targetTimestamp]);

  return timeLeft;
}
