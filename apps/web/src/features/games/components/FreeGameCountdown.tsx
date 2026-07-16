"use client";

import { useLangStore } from "@/store/useLangStore";
import { useCountdown } from "@/hooks/useCountdown";

import { FreeGameCountdownProps } from "../types";
import { FREE_GAME_COUNTDOWN_LABELS } from "../constants";
import { parseGameTimestamp } from "../utils";

export default function FreeGameCountdown({
  timestamp,
}: FreeGameCountdownProps) {
  const { lang } = useLangStore();
  
  const targetTime = parseGameTimestamp(timestamp);

  const timeLeft = useCountdown(targetTime);

  if (!timeLeft) return null;

  const l = FREE_GAME_COUNTDOWN_LABELS[lang] || FREE_GAME_COUNTDOWN_LABELS.en;

  const pad = (num: number) => num.toString().padStart(2, "0");

  const TimeUnit = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
      <div className="bg-light-blue/25 border border-white/20 rounded-md px-1.5 py-1 min-w-[28px] flex justify-center items-center backdrop-blur-sm">
        <span className="text-white font-bold text-xs">{pad(value)}</span>
      </div>
      <span className="text-[#9CB4DD] text-[8px] mt-1 uppercase text-center leading-none font-bold tracking-wider">
        {label}
      </span>
    </div>
  );

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-linear-to-br from-secondary-blue/90 to-primary-bg/90 backdrop-blur-sm p-2">
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
