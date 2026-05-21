"use client";

import React from "react";
import { useCountdown } from "../../hooks/useCountdown";

interface EventCountdownProps {
  startTime: number;
}

const EventCountdown = React.memo(function EventCountdown({ startTime }: EventCountdownProps) {
  const countdown = useCountdown(startTime);

  if (!countdown) return null;

  const { days, hours, minutes, seconds } = countdown;

  return (
    <div className="flex items-center gap-2 sm:gap-4 mt-4">
      <CountdownBox value={days} label="Days" />
      <span className="text-gray-400 text-2xl font-bold mb-4">:</span>
      <CountdownBox value={hours} label="Hours" />
      <span className="text-gray-400 text-2xl font-bold mb-4">:</span>
      <CountdownBox value={minutes} label="Min" />
      <span className="text-gray-400 text-2xl font-bold mb-4">:</span>
      <CountdownBox value={seconds} label="Sec" />
    </div>
  );
})

const CountdownBox = React.memo(function CountdownBox({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center shadow-lg backdrop-blur-sm">
        <span className="text-xl sm:text-2xl font-extrabold text-white font-mono">
          {value.toString().padStart(2, "0")}
        </span>
      </div>
      <span className="text-[10px] sm:text-xs text-gray-400 font-bold uppercase tracking-wider mt-2">
        {label}
      </span>
    </div>
  );
})

export default EventCountdown;
