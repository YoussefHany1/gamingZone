import { Play, X } from "lucide-react";
import { GameVideosProps } from "../types";

export default function GameVideos({
  videos,
  activeVideoId,
  setActiveVideoId, t, lang,}: GameVideosProps) {
  const isRtl = lang === "ar";
  const textDirectionClass = isRtl ? "text-right" : "text-left";

  if (!videos || videos.length === 0) return null;

  return (
    <div className="glass-panel border border-white/10 p-6 rounded-3xl space-y-4 shadow-xl">
      <h2
        className={`text-base font-black text-white border-b border-white/5 pb-2 flex items-center gap-1.5 ${isRtl ? "flex-row-reverse" : "flex-row"}`}
      >
        <Play className="w-4 h-4 text-light-blue" />
        <span>{t("games.details.trailer")}</span>
      </h2>

      {/* Inline dynamic player */}
      {activeVideoId && (
        <div className="space-y-2 animate-in fade-in zoom-in-95 duration-300">
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/10 shadow-lg bg-black">
            <iframe
              src={`https://www.youtube.com/embed/${activeVideoId}?autoplay=1&rel=0`}
              title="Game Trailer Player"
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            ></iframe>
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => setActiveVideoId(null)}
              className="px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-extrabold text-xs flex items-center gap-1 hover:bg-red-500/20 transition-all active:scale-95 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>{t("games.details.closePlayer")}</span>
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {videos.map((vid, idx) => {
          const isSelected = activeVideoId === vid.video_id;
          return (
            <button
              key={idx}
              onClick={() => setActiveVideoId(vid.video_id)}
              className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all active:scale-95 shadow-sm cursor-pointer ${
                isSelected
                  ? "bg-light-blue/10 border-light-blue text-white font-black"
                  : "bg-white/5 hover:bg-white/10 border-white/5 text-gray-200 hover:text-white"
              } ${isRtl ? "flex-row-reverse" : "flex-row"}`}
            >
              <div
                className={`p-2 rounded-lg text-white ${isSelected ? "bg-light-blue" : "bg-red-600"}`}
              >
                <Play className="w-4 h-4 fill-white" />
              </div>
              <span
                className={`truncate grow text-xs font-bold ${textDirectionClass}`}
              >
                {vid.name ||
                  (isRtl
                    ? "مشاهدة العرض التشويقي للعبة"
                    : "Watch Game Trailer")}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
