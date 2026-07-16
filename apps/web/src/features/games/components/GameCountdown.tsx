"use client";

import React from "react";
import { useLangStore } from "../../../store/useLangStore";
import { useCountdown } from "@/hooks/useCountdown";

import { GameCountdownProps } from "../types";
import { GAME_COUNTDOWN_LABELS } from "../constants";

export default function GameCountdown({ timestamp }: GameCountdownProps) {
  const { lang } = useLangStore();
  const timeLeft = useCountdown(timestamp);

  if (!timeLeft) return null;

  const l = GAME_COUNTDOWN_LABELS[lang] || GAME_COUNTDOWN_LABELS.en;

  return (
    <div className="absolute inset-0 bg-black/60 flex flex-col justify-center items-center z-20 backdrop-blur-[2px]">
      <div className="flex gap-2 sm:gap-4 items-center">
        <div className="flex flex-col items-center">
          <span className="text-white text-[9px] sm:text-[10px] font-semibold mb-0.5 uppercase tracking-wider">
            {l.days}
          </span>
          <span className="bg-light-blue/40 border border-light-blue/20 text-white font-black text-sm sm:text-base px-2 sm:px-3 py-0.5 sm:py-1 rounded-full shadow-lg">
            {timeLeft.days}
          </span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-white text-[9px] sm:text-[10px] font-semibold mb-0.5 uppercase tracking-wider">
            {l.hours}
          </span>
          <span className="bg-light-blue/40 border border-light-blue/20 text-white font-black text-sm sm:text-base px-2 sm:px-3 py-0.5 sm:py-1 rounded-full shadow-lg">
            {timeLeft.hours}
          </span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-white text-[9px] sm:text-[10px] font-semibold mb-0.5 uppercase tracking-wider">
            {l.minutes}
          </span>
          <span className="bg-light-blue/40 border border-light-blue/20 text-white font-black text-sm sm:text-base px-2 sm:px-3 py-0.5 sm:py-1 rounded-full shadow-lg">
            {timeLeft.minutes}
          </span>
        </div>
      </div>
    </div>
  );
}
