import { useState, useEffect } from "react";
import { SlideshowGame as Game } from "../types";
import { hasVideo } from "../utils";

const SERVER_URL = "https://igdb-api-omega.vercel.app";

export function useSlideshow() {
  const [trailers, setTrailers] = useState<Game[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTrailers() {
      try {
        const response = await fetch(`${SERVER_URL}/latest-trailers`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: Game[] = await response.json();
        if (Array.isArray(data)) {
          setTrailers(data.filter(hasVideo));
        }
      } catch (error) {
        console.warn("Failed to fetch latest trailers (network error or proxy down).");
      } finally {
        setLoading(false);
      }
    }
    fetchTrailers();
  }, []);

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

  return { trailers, currentIndex, setCurrentIndex, loading, playingVideoId, setPlayingVideoId, nextSlide, prevSlide };
}
