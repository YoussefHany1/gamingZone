"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import axios from "axios";
import { useLangStore } from "../../store/useLangStore";
import { ChevronLeft, ChevronRight, PlayCircle, X } from "lucide-react";

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "/api";

interface Video {
  video_id: string;
  name: string;
}

interface Game {
  id: number;
  name: string;
  cover?: { image_id: string };
  screenshots?: { image_id: string }[];
  videos?: Video[];
}

function getTrailerVideoId(item: Game): string | undefined {
  const video =
    item.videos?.find((v) => v.name?.toLowerCase().includes("trailer")) ??
    item.videos?.[0];
  return video?.video_id;
}

function hasVideo(item: Game): boolean {
  return !!getTrailerVideoId(item);
}

function getImageSource(item: Game) {
  if (item.screenshots?.[0]?.image_id) {
    return `https://images.igdb.com/igdb/image/upload/t_1080p/${item.screenshots[0].image_id}.webp`;
  }
  if (item.cover?.image_id) {
    return `https://images.igdb.com/igdb/image/upload/t_cover_big/${item.cover.image_id}.webp`;
  }
  return "/assets/image-not-found.webp";
}

const Slideshow = React.memo(function Slideshow() {
  const { lang, t } = useLangStore();
  const [trailers, setTrailers] = useState<Game[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTrailers() {
      try {
        const response = await axios.get<Game[]>(`${SERVER_URL}/latest-trailers`);
        if (Array.isArray(response.data)) {
          setTrailers(response.data.filter(hasVideo));
        }
      } catch (error) {
        console.error("Error fetching latest trailers:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchTrailers();
  }, []);

  // Auto transition every 6 seconds
  useEffect(() => {
    if (trailers.length <= 1 || playingVideoId) return; // Pause auto slide when video is playing
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % trailers.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [trailers, playingVideoId]);

  const prevSlide = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + trailers.length) % trailers.length);
  };

  const nextSlide = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % trailers.length);
  };

  if (loading) {
    return (
      <div className="w-full h-72 sm:h-96 md:h-[450px] rounded-3xl glass-panel animate-pulse bg-white/5"></div>
    );
  }

  if (trailers.length === 0) return null;

  const currentSlide = trailers[currentIndex];
  const imageSrc = getImageSource(currentSlide);
  const videoId = getTrailerVideoId(currentSlide);

  return (
    <>
      <div 
        className="relative w-full h-72 sm:h-96 md:h-[450px] rounded-3xl overflow-hidden glass-panel border border-white/10 group shadow-2xl cursor-pointer"
        onClick={() => videoId && setPlayingVideoId(videoId)}
      >
        {/* Background Image Slider */}
        <div className="absolute inset-0 z-0">
          <Image
            src={imageSrc}
            alt={currentSlide.name}
            fill
            priority
            className="object-cover transition-all duration-1000 ease-in-out scale-100 group-hover:scale-105"
          />
          {/* Dark Vignette Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-dark-bg via-dark-bg/40 to-transparent"></div>
        </div>

        {/* Nav Controls */}
        <button
          onClick={prevSlide}
          className={`absolute top-1/2 -translate-y-1/2 ${
            lang === "ar" ? "right-4" : "left-4"
          } z-20 p-2 bg-dark-bg/60 border border-white/10 rounded-full text-white opacity-0 group-hover:opacity-100 active:scale-90 transition-all duration-300 hover:bg-light-blue hover:border-light-blue`}
        >
          <ChevronLeft className="w-5 h-5 rtl-flip" />
        </button>
        <button
          onClick={nextSlide}
          className={`absolute top-1/2 -translate-y-1/2 ${
            lang === "ar" ? "left-4" : "right-4"
          } z-20 p-2 bg-dark-bg/60 border border-white/10 rounded-full text-white opacity-0 group-hover:opacity-100 active:scale-90 transition-all duration-300 hover:bg-light-blue hover:border-light-blue`}
        >
          <ChevronRight className="w-5 h-5 rtl-flip" />
        </button>

        {/* Content Info Card */}
        <div
          className={`absolute bottom-0 inset-x-0 z-10 p-6 md:p-10 flex flex-col justify-end gap-3 ${
            lang === "ar" ? "text-right" : "text-left"
          }`}
        >
          <h2 className="flex items-center gap-3 text-xl sm:text-2xl md:text-3xl font-extrabold text-white leading-tight line-clamp-2 max-w-4xl text-shadow">
            <PlayCircle className="w-8 h-8 sm:w-10 sm:h-10 text-white fill-white/20 group-hover:text-light-blue group-hover:fill-light-blue/20 transition-colors" />
            <span>{currentSlide.name}</span>
          </h2>
          <span className="text-gray-300 text-sm font-medium">
            {t("home.slideshow.subtitle") || "Watch Latest Trailer"}
          </span>
        </div>

        {/* Dots Indicator */}
        <div className="absolute bottom-4 right-4 z-20 flex gap-1.5">
          {trailers.map((_, i) => (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(i);
              }}
              className={`w-2.5 h-1.5 rounded-full transition-all duration-300 ${
                i === currentIndex ? "w-6 bg-light-blue" : "bg-white/30"
              }`}
            ></button>
          ))}
        </div>
      </div>

      {/* Video Modal */}
      {playingVideoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="relative w-full max-w-5xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10">
            <button
              onClick={() => setPlayingVideoId(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-red-500 rounded-full text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${playingVideoId}?autoplay=1`}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0"
            ></iframe>
          </div>
        </div>
      )}
    </>
  );
})

export default Slideshow;
