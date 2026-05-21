import React from "react";
import Image from "next/image";
import Link from "next/link";

interface Game {
  id: number;
  name: string;
  cover?: { image_id: string };
}

const EventGameCard = React.memo(function EventGameCard({ game }: { game: Game }) {
  const coverSrc = game.cover?.image_id
    ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${game.cover.image_id}.webp`
    : "/assets/image-not-found.webp";

  return (
    <Link
      href={`/games/${game.id}`}
      className="group flex-shrink-0 w-28 sm:w-32 rounded-xl overflow-hidden glass-panel border border-white/10 hover:border-light-blue/50 transition-all duration-300 hover:-translate-y-1 shadow-md"
    >
      <div className="relative w-full aspect-[3/4] overflow-hidden">
        <Image
          src={coverSrc}
          alt={game.name}
          fill
          sizes="128px"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          unoptimized={!game.cover?.image_id}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-dark-bg/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      </div>
      <div className="p-2 sm:p-3 h-12 flex items-center justify-center">
        <h4 className="text-[10px] sm:text-xs font-bold text-white text-center line-clamp-2 group-hover:text-light-blue transition-colors">
          {game.name}
        </h4>
      </div>
    </Link>
  );
})

export default EventGameCard;
