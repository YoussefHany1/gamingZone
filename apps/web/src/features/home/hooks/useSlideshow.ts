import { useState, useEffect } from "react";
import { SlideshowGame as Game } from "../types";
import { hasVideo } from "../utils";

export function useSlideshow(initialTrailers?: Game[]) {
  const [trailers] = useState<Game[]>(() => (initialTrailers ?? []).filter(hasVideo));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

  useEffect(() => {
    if (trailers.length <= 1 || playingVideoId) return;
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

  return {
    trailers,
    currentIndex,
    setCurrentIndex,
    playingVideoId,
    setPlayingVideoId,
    nextSlide,
    prevSlide,
  };
}
