import Image from "next/image";
import Link from "@/components/Link";
import { Gamepad2 } from "lucide-react";
import { GameSimilarProps } from "../types";

export default function GameSimilar({ similarGames, t }: GameSimilarProps) {
  if (similarGames.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-black text-white flex items-center gap-2">
        <Gamepad2 className="w-5 h-5 text-light-blue animate-pulse" />
        <span>{t("games.details.similar")}</span>
      </h2>

      <div className="flex gap-4 overflow-x-auto pb-3 scrollbar">
        {similarGames.map((g) => {
          const sCover = g.cover?.image_id
            ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${g.cover.image_id}.webp`
            : "/placeholder-news.jpg";
          return (
            <Link
              key={g.id}
              href={`/games/${g.id}`}
              className="shrink-0 w-32 group space-y-2 block"
            >
              <div className="relative w-full aspect-3/4 rounded-xl overflow-hidden border border-white/5 bg-white/5 transition-transform duration-300 group-hover:-translate-y-1">
                <Image
                  src={sCover}
                  alt={g.name}
                  fill
                  sizes="128px"
                  className="object-cover"
                />
              </div>
              <span
                className={`text-[11px] font-bold text-gray-300 group-hover:text-light-blue transition-colors line-clamp-2 block leading-snug`}
              >
                {g.name}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
