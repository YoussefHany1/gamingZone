import React from "react";
import Link from "next/link";
import Image from "next/image";

import GameCountdown from "./GameCountdown";

interface Game {
  id: number;
  name: string;
  cover?: { image_id: string };
  total_rating?: number;
  first_release_date?: number;
}

interface GameRowProps {
  title: string;
  icon: React.ReactNode;
  games: Game[];
  showCountdown?: boolean;
}

const GameRow = React.memo(function GameRow({ title, icon, games, showCountdown }: GameRowProps) {
  if (!games || games.length === 0) return null;

  return (
    <section className="space-y-6">
      <h2 className="text-xl font-black text-white flex items-center gap-2">
        {icon}
        <span>{title}</span>
      </h2>

      <div className="flex gap-4 overflow-x-auto pb-4 px-1 scrollbar">
        {games.map((game, index) => {
          const cover = game.cover
            ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${game.cover.image_id}.webp`
            : "/assets/image-not-found.webp";
            
          return (
            <Link
              key={`${game.id}-${index}`}
              href={`/games/${game.id}`}
              className={`group flex-shrink-0 ${showCountdown ? "w-56" : "w-44"} rounded-2xl overflow-hidden glass-panel glass-panel-hover border border-white/10 p-3 flex flex-col gap-3 shadow-md`}
            >
              <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden z-0">
                <Image
                  src={cover}
                  alt={game.name}
                  fill
                  sizes={showCountdown ? "224px" : "150px"}
                  className="object-cover bg-secondary-blue"
                />
                {!showCountdown && (
                  <span className="absolute top-2 left-2 bg-dark-bg/85 border border-white/10 px-2 py-0.5 rounded text-[10px] font-bold text-gray-300 z-10">
                    #{index + 1}
                  </span>
                )}
                {showCountdown && game.first_release_date && (
                  <GameCountdown timestamp={game.first_release_date} />
                )}
              </div>
              <h3 className="font-extrabold text-xs text-white group-hover:text-light-blue line-clamp-2 min-h-[32px] transition-colors leading-snug">
                {game.name}
              </h3>
            </Link>
          );
        })}
      </div>
    </section>
  );
})

export default GameRow;
