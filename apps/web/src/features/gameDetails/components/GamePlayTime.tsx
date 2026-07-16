import { Clock } from "lucide-react";
import { GamePlayTimeProps } from "../types";

export default function GamePlayTime({ playTime, t, lang}: GamePlayTimeProps) {
  const isRtl = lang === "ar";

  if (!playTime) return null;

  return (
    <div className="glass-panel border border-white/10 p-6 rounded-3xl space-y-4 shadow-xl">
      <h2
        className={`text-base font-black text-white border-b border-white/5 pb-2 flex items-center gap-1.5 ${isRtl ? "flex-row-reverse" : "flex-row"}`}
      >
        <Clock className="w-4 h-4 text-light-blue" />
        <span>{t("games.details.howLongToBeat.title")}</span>
      </h2>

      <div className="space-y-3 text-xs">
        {playTime.main && (
          <div
            className={`flex justify-between items-center bg-white/5 p-3 rounded-2xl ${isRtl ? "flex-row-reverse" : "flex-row"}`}
          >
            <span className="text-gray-400 font-bold">
              {t("games.details.howLongToBeat.main")}
            </span>
            <span className="text-light-blue font-black text-sm">
              {playTime.main} {t("games.details.howLongToBeat.hours")}
            </span>
          </div>
        )}

        {playTime.mainExtra && (
          <div
            className={`flex justify-between items-center bg-white/5 p-3 rounded-2xl ${isRtl ? "flex-row-reverse" : "flex-row"}`}
          >
            <span className="text-gray-400 font-bold">
              {t("games.details.howLongToBeat.mainExtra")}
            </span>
            <span className="text-[#66c0f4] font-black text-sm">
              {playTime.mainExtra}{" "}
              {t("games.details.howLongToBeat.hours")}
            </span>
          </div>
        )}

        {playTime.completionist && (
          <div
            className={`flex justify-between items-center bg-white/5 p-3 rounded-2xl ${isRtl ? "flex-row-reverse" : "flex-row"}`}
          >
            <span className="text-gray-400 font-bold">
              {t("games.details.howLongToBeat.completionist")}
            </span>
            <span className="text-light-blue font-black text-sm">
              {playTime.completionist}{" "}
              {t("games.details.howLongToBeat.hours")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
