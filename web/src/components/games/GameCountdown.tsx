"use client";

import React, { useEffect, useState } from "react";
import { useLangStore } from "../../store/useLangStore";

interface GameCountdownProps {
  timestamp: number;
}

export default function GameCountdown({ timestamp }: GameCountdownProps) {
  const { lang } = useLangStore();
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const updateCountdown = () => {
      const now = Math.floor(Date.now() / 1000);
      const diff = timestamp - now;
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0 });
        return;
      }
      const days = Math.floor(diff / (60 * 60 * 24));
      const hours = Math.floor((diff % (60 * 60 * 24)) / (60 * 60));
      const minutes = Math.floor((diff % (60 * 60)) / 60);
      setTimeLeft({ days, hours, minutes });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, [timestamp]);

  if (!mounted) return null;

  const labels = {
    en: { days: "Days", hours: "Hours", minutes: "Mins" },
    ar: { days: "أيام", hours: "ساعات", minutes: "دقائق" },
  };

  const l = labels[lang] || labels.en;

  return (
    <div className="absolute inset-0 bg-black/60 flex flex-col justify-center items-center z-20 backdrop-blur-[2px]">
      <div className="flex gap-2 sm:gap-4 items-center">
        <div className="flex flex-col items-center">
          <span className="text-white text-[9px] sm:text-[10px] font-semibold mb-0.5 uppercase tracking-wider">{l.days}</span>
          <span className="bg-light-blue/40 border border-light-blue/20 text-white font-black text-sm sm:text-base px-2 sm:px-3 py-0.5 sm:py-1 rounded-full shadow-lg">{timeLeft.days}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-white text-[9px] sm:text-[10px] font-semibold mb-0.5 uppercase tracking-wider">{l.hours}</span>
          <span className="bg-light-blue/40 border border-light-blue/20 text-white font-black text-sm sm:text-base px-2 sm:px-3 py-0.5 sm:py-1 rounded-full shadow-lg">{timeLeft.hours}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-white text-[9px] sm:text-[10px] font-semibold mb-0.5 uppercase tracking-wider">{l.minutes}</span>
          <span className="bg-light-blue/40 border border-light-blue/20 text-white font-black text-sm sm:text-base px-2 sm:px-3 py-0.5 sm:py-1 rounded-full shadow-lg">{timeLeft.minutes}</span>
        </div>
      </div>
    </div>
  );
}
