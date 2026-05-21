"use client";

import React, { useState } from "react";
import Image from "next/image";
import { PlayCircle, X } from "lucide-react";

interface Video {
  video_id: string;
  name: string;
}

export default function EventVideoCard({ video }: { video: Video }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div
        onClick={() => setIsOpen(true)}
        className="group relative flex-shrink-0 w-64 h-36 rounded-2xl overflow-hidden glass-panel border border-white/10 cursor-pointer shadow-lg hover:shadow-live-red/20 transition-all duration-300 hover:-translate-y-1"
      >
        <Image
          src={`https://img.youtube.com/vi/${video.video_id}/mqdefault.jpg`}
          alt={video.name}
          fill
          className="object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-dark-bg/90 via-dark-bg/20 to-transparent"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <PlayCircle className="w-12 h-12 text-white opacity-80 group-hover:opacity-100 group-hover:text-light-blue transition-colors group-hover:scale-110 duration-300" />
        </div>
        <div className="absolute bottom-3 left-3 right-3">
          <h4 className="text-white text-xs font-bold line-clamp-1 text-shadow">
            {video.name}
          </h4>
        </div>
      </div>

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
              src={`https://www.youtube.com/embed/${video.video_id}?autoplay=1`}
              title={video.name}
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
}
