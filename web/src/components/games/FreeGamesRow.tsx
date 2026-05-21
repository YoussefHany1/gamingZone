"use client";
import React from "react";
import Image from "next/image";
import { Gift } from "lucide-react";
import FreeGameCountdown from "./FreeGameCountdown";
import { useLangStore } from "../../store/useLangStore";

export interface FreeGame {
  id: string;
  title: string;
  image?: string;
  store?: string;
  url?: string;
  type: string;
  startDate?: string | number;
  endDate?: string | number;
}

interface FreeGamesRowProps {
  games: FreeGame[];
}

const FreeGamesRow = React.memo(function FreeGamesRow({ games }: FreeGamesRowProps) {
  const { t } = useLangStore();
  if (!games || games.length === 0) return null;

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-white flex items-center gap-2">
          <Gift className="w-6 h-6 text-light-blue" />
          <span>{t("games.list.freeGames.header")}</span>
        </h2>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 px-1 scrollbar">
        {games.map((fg) => {
          let storeIcon = "/assets/epic-games.webp";
          if (fg.store === "steam") storeIcon = "/assets/steam.webp";
          if (fg.store === "gog") storeIcon = "/assets/gog.webp";

          return (
            <div
              key={fg.id}
              className="group flex-shrink-0 w-[165px] h-[300px] rounded-[16px] overflow-hidden relative shadow-lg flex flex-col bg-gradient-to-b from-[#1a3052] to-[#0c1a33] border border-white/10 transition-transform duration-300 hover:-translate-y-1"
            >
              <div className="relative w-full h-[200px] z-0 overflow-hidden">
                {/* Image */}
                <Image
                  src={fg.image || "/assets/image-not-found.webp"}
                  alt={fg.title}
                  fill
                  sizes="165px"
                  className="object-cover"
                />

                {/* Bottom dark gradient over image */}
                <div className="absolute bottom-0 left-0 right-0 h-[40%] bg-gradient-to-t from-[#0b1426]/90 to-transparent z-10 pointer-events-none" />

                {/* Store Icon Badge */}
                <div className="absolute bottom-2 left-2 bg-[#0c1a33]/90 rounded-full p-1.5 border border-[#516996] z-20">
                  <Image
                    src={storeIcon}
                    alt={fg.store || "store"}
                    width={20}
                    height={20}
                    className="object-contain"
                  />
                </div>

                {/* Countdown for Upcoming games */}
                {fg.type === "next" && fg.startDate && (
                  <FreeGameCountdown timestamp={fg.startDate} />
                )}
              </div>

              <div className="flex-1 p-3 flex flex-col justify-between">
                <h3 className="text-white text-[13px] font-bold leading-tight text-center line-clamp-2">
                  {fg.title}
                </h3>

                {fg.type === "current" && (
                  <a
                    href={fg.url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 py-2 mt-2 bg-gradient-to-br from-[#9CB4DD] to-[#516996] rounded-xl shadow-md transition-all active:scale-95 hover:opacity-90"
                  >
                    <Gift className="w-4 h-4 text-white" />
                    <span className="text-white text-[11px] font-bold tracking-wide uppercase">
                      Claim Now
                    </span>
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
})

export default FreeGamesRow;
