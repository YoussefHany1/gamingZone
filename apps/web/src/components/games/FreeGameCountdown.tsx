"use client";

import React, { useEffect, useState } from "react";
import { useLangStore } from "../../store/useLangStore";

interface FreeGameCountdownProps {
  timestamp: string | number;
}

export default function FreeGameCountdown({ timestamp }: FreeGameCountdownProps) {
  const { lang } = useLangStore();
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    let targetTime: number;

    // Convert string ISO date to seconds, or use number directly (assuming IGDB uses seconds and Appwrite uses ISO strings)
    if (typeof timestamp === "string") {
      targetTime = Math.floor(new Date(timestamp).getTime() / 1000);
    } else {
      // If it's a huge number, it's ms, otherwise s
      targetTime = timestamp > 1e11 ? Math.floor(timestamp / 1000) : timestamp;
    }

    const updateCountdown = () => {
      const now = Math.floor(Date.now() / 1000);
      const diff = targetTime - now;
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      const days = Math.floor(diff / (60 * 60 * 24));
      const hours = Math.floor((diff % (60 * 60 * 24)) / (60 * 60));
      const minutes = Math.floor((diff % (60 * 60)) / 60);
      const seconds = Math.floor(diff % 60);
      setTimeLeft({ days, hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000); // update every second
    return () => clearInterval(interval);
  }, [timestamp]);

  if (!mounted) return null;

  const labels = {
    en: { freeOn: "Free On Epic", days: "Days", hours: "Hrs", minutes: "Min", seconds: "Sec" },
    ar: { freeOn: "مجاني قريباً", days: "أيام", hours: "ساعات", minutes: "دقائق", seconds: "ثواني" },
  };

  const l = labels[lang] || labels.en;

  const pad = (num: number) => num.toString().padStart(2, "0");

  const TimeUnit = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
      <div className="bg-[#779bdd]/25 border border-white/20 rounded-md px-1.5 py-1 min-w-[28px] flex justify-center items-center backdrop-blur-sm">
        <span className="text-white font-bold text-xs">{pad(value)}</span>
      </div>
      <span className="text-[#9CB4DD] text-[8px] mt-1 uppercase text-center leading-none font-bold tracking-wider">{label}</span>
    </div>
  );

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-[#516996]/90 to-[#0c1a33]/90 backdrop-blur-sm p-2">
      <h4 className="text-white text-xs font-bold mb-2 text-center drop-shadow-md">
        {l.freeOn}
      </h4>
      <div className="flex items-center justify-center gap-1">
        <TimeUnit value={timeLeft.days} label={l.days} />
        <span className="text-white/50 font-bold text-sm mb-3">:</span>
        <TimeUnit value={timeLeft.hours} label={l.hours} />
        <span className="text-white/50 font-bold text-sm mb-3">:</span>
        <TimeUnit value={timeLeft.minutes} label={l.minutes} />
        <span className="text-white/50 font-bold text-sm mb-3">:</span>
        <TimeUnit value={timeLeft.seconds} label={l.seconds} />
      </div>
    </div>
  );
}
