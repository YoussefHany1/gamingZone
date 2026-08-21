import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  X,
} from "lucide-react";
import { GameScreenshotsProps } from "../types";

export default function GameScreenshots({
  screenshots,
  activeScreenshotIdx,
  setActiveScreenshotIdx,
  handleNextScreenshot,
  handlePrevScreenshot,
  zoomScale,
  setZoomScale,
  t,
  lang,
}: GameScreenshotsProps) {
  const isRtl = lang === "ar";

  if (!screenshots || screenshots.length === 0) return null;

  return (
    <>
      <section className="space-y-4">
        <h2 className="text-lg font-black text-white">
          {t("games.details.screenshotsGallery")}
        </h2>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar px-1">
          {screenshots.map((scr, idx) => {
            const medUrl = `https://images.igdb.com/igdb/image/upload/t_screenshot_med/${scr.image_id}.webp`;
            return (
              <div
                key={idx}
                onClick={() => setActiveScreenshotIdx(idx)}
                className="relative shrink-0 w-80 aspect-video rounded-2xl overflow-hidden border border-white/10 shadow-md bg-white/5 cursor-pointer hover:border-light-blue/30 active:scale-98 transition-all group"
              >
                <Image
                  src={medUrl}
                  alt={`Screenshot ${idx + 1}`}
                  fill
                  sizes="320px"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* Premium Lightbox Modal with Zoom and Swiping/Navigation */}
      {activeScreenshotIdx !== null && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md p-4 sm:p-8 animate-in fade-in duration-300 select-none"
          onClick={() => setActiveScreenshotIdx(null)}
        >
          {/* Top Control Bar */}
          <div
            className="absolute top-4 left-4 right-4 flex items-center justify-between z-50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex gap-2">
              <button
                onClick={() => setZoomScale(Math.min(zoomScale + 0.5, 3))}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
              <button
                onClick={() => setZoomScale(Math.max(zoomScale - 0.5, 1))}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              {zoomScale > 1 && (
                <button
                  onClick={() => setZoomScale(1)}
                  className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              )}
            </div>
            <button
              onClick={() => setActiveScreenshotIdx(null)}
              className="p-2.5 rounded-xl bg-red-500/80 hover:bg-red-500 text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Arrows */}
          <button
            onClick={handlePrevScreenshot}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 sm:p-4 rounded-full bg-black/50 hover:bg-black border border-white/10 text-white transition-all hover:scale-110 z-50 cursor-pointer"
          >
            <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
          </button>
          <button
            onClick={handleNextScreenshot}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 sm:p-4 rounded-full bg-black/50 hover:bg-black border border-white/10 text-white transition-all hover:scale-110 z-50 cursor-pointer"
          >
            <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
          </button>

          {/* Active Image Container */}
          <div
            className="relative w-full h-full max-w-7xl max-h-[85vh] flex items-center justify-center cursor-default transition-transform duration-300 ease-out"
            style={{ transform: `scale(${zoomScale})` }}
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={`https://images.igdb.com/igdb/image/upload/t_1080p/${screenshots[activeScreenshotIdx].image_id}.webp`}
              alt="Fullscreen Screenshot"
              fill
              sizes="100vw"
              className="object-contain"
              priority
            />
          </div>

          {/* Image Counter */}
          <div className="absolute bottom-6 font-bold text-white/70 bg-black/50 px-4 py-1.5 rounded-full text-sm z-50 tracking-widest">
            {activeScreenshotIdx + 1} / {screenshots.length}
          </div>
        </div>
      )}
    </>
  );
}
