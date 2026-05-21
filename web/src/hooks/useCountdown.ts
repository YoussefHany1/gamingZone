import { useEffect, useState } from "react";

interface CountdownResult {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function useCountdown(targetTimestamp: number | null): CountdownResult | null {
  const [timeLeft, setTimeLeft] = useState<CountdownResult | null>(null);

  useEffect(() => {
    const target = targetTimestamp;
    if (target === null) {
      setTimeLeft(null);
      return;
    }

    const targetNum: number = target;

    function calculateTime() {
      const difference = targetNum * 1000 - Date.now();
      
      if (difference <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    }

    setTimeLeft(calculateTime());

    const interval = setInterval(() => {
      const updatedTime = calculateTime();
      setTimeLeft(updatedTime);
      
      const difference = targetNum * 1000 - Date.now();
      if (difference <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetTimestamp]);

  return timeLeft;
}
