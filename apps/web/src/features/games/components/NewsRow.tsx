import React from "react";
import Link from "../../../components/Link";
import Image from "next/image";
import { useLangStore } from "../../../store/useLangStore";

import { NewsGame, NewsRowProps } from "../types";

import { NEWS_GAMES_DATA } from "../constants";

const NewsRow = React.memo(function NewsRow({ title, icon }: NewsRowProps) {
  const { t } = useLangStore();
  return (
    <section className="space-y-6">
      <h2 className="text-xl font-black text-white flex items-center gap-2">
        {icon}
        <span>{title}</span>
      </h2>

      <div className="flex gap-4 overflow-x-auto pb-4 px-1 scrollbar">
        {NEWS_GAMES_DATA.map((game) => (
          <Link
            key={game.id}
            href={`/news?source=${game.name.toLowerCase()}`}
            className="group shrink-0 w-[165px] h-[250px] rounded-[16px] overflow-hidden relative shadow-lg flex flex-col bg-linear-to-b from-[#1a3052] to-primary-bg border border-white/10 transition-transform duration-300 hover:-translate-y-1"
          >
            <div className="relative w-full h-[200px] z-0 overflow-hidden">
              <Image
                src={game.image}
                alt={game.name}
                fill
                sizes="165px"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute bottom-0 left-0 right-0 h-[50%] bg-linear-to-t from-[#0b1426]/90 to-transparent z-10 pointer-events-none" />
            </div>

            <div className="flex-1 p-3 flex flex-col justify-center">
              <h3 className="text-white text-[15px] font-bold leading-[18px] text-center line-clamp-2">
                {game.name}
              </h3>
            </div>

            {/* LIVE Badge */}
            <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-primary-bg/90 px-2 py-1 rounded-full border border-[#FF3B30] z-20">
              <div className="w-1.5 h-1.5 rounded-full bg-[#FF3B30] animate-pulse" />
              <span className="text-[#FF3B30] text-[10px] font-bold tracking-wider">
                {t("games.list.gamesNews.live")}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
});

export default NewsRow;
