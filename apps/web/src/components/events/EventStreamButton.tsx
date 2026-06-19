"use client";

import React, { useState } from "react";
import { PlayCircle, Radio, X } from "lucide-react";

interface EventStreamButtonProps {
  url: string;
  status: "live" | "upcoming" | "ended";
}

export default function EventStreamButton({ url, status }: EventStreamButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Helper to check if URL is embeddable and return the embed URL
  const getEmbedInfo = (rawUrl: string): { isEmbeddable: boolean; embedUrl: string } => {
    try {
      const urlObj = new URL(rawUrl);
      
      // YouTube
      if (urlObj.hostname.includes("youtube.com") || urlObj.hostname.includes("youtu.be")) {
        const videoId = urlObj.searchParams.get("v") || urlObj.pathname.split("/").pop();
        return { isEmbeddable: true, embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1` };
      }
      
      // Twitch
      if (urlObj.hostname.includes("twitch.tv")) {
        const channel = urlObj.pathname.split("/")[1];
        return { isEmbeddable: true, embedUrl: `https://player.twitch.tv/?channel=${channel}&parent=${window.location.hostname}` };
      }
      
      return { isEmbeddable: false, embedUrl: rawUrl };
    } catch {
      return { isEmbeddable: false, embedUrl: rawUrl };
    }
  };

  const { isEmbeddable, embedUrl } = getEmbedInfo(url);

  const handleOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isEmbeddable) {
      setIsOpen(true);
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className={`w-full sm:w-auto px-8 flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-lg text-white shadow-lg transition-all active:scale-95 ${
          status === "live"
            ? "bg-gradient-to-br from-live-red to-red-500 shadow-live-red/40 hover:opacity-90"
            : "bg-gradient-to-br from-secondary-blue to-gray-600 hover:opacity-90"
        }`}
      >
        {status === "live" ? (
          <Radio className="w-6 h-6 animate-pulse" />
        ) : (
          <PlayCircle className="w-6 h-6" />
        )}
        <span>{status === "live" ? "Watch Live Stream" : "View Details"}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="relative w-full max-w-5xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-red-500 rounded-full text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <iframe
              width="100%"
              height="100%"
              src={embedUrl}
              title="Stream Video"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 bg-dark-bg"
            ></iframe>
          </div>
        </div>
      )}
    </>
  );
}
