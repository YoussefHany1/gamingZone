import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Newspaper } from "lucide-react";
import { useLangStore } from "../../store/useLangStore";

interface NewsGame {
  id: string;
  name: string;
  image: string;
  apiUrl: string;
  source?: string;
}

const GAMES_DATA: NewsGame[] = [
  {
    id: "1",
    name: "League of Legends",
    image:
      "https://newzoo.com/wp-content/uploads/api/games/artworks/game--league-of-legends.jpg",
    apiUrl:
      "https://news.google.com/rss/search?q=league%20of%20legends%20news&hl=",
    source: "https://www.leagueoflegends.com/news/",
  },
  {
    id: "2",
    name: "Valorant",
    image:
      "https://cmsassets.rgpub.io/sanity/images/dsfx7636/news_live/f657721a7eb06acae52a29ad3a951f20c1e5fc60-1920x1080.jpg",
    apiUrl: "https://games-news-api.vercel.app/valorant/",
    source: "https://playvalorant.com/news/",
  },
  {
    id: "3",
    name: "Fortnite",
    image: "https://e.snmc.io/lk/f/x/8c434690de9afaac992d0c20fc870bfc/11579669",
    apiUrl: "https://fortnite-api.com/v2/news?language=",
  },
  {
    id: "4",
    name: "EA Sports FC 26",
    image:
      "https://file.booster.gearupportal.com/file/689ef73d36a337f883dbcddeI0uOdssK03.png?fop=imageView/2/w/280/f/webp",
    apiUrl: "https://games-news-api.vercel.app/eafc/",
    source: "https://www.ea.com/en/games/ea-sports-fc/fc-26/news",
  },
  {
    id: "5",
    name: "Marvel Rivals",
    image:
      "https://m.media-amazon.com/images/M/MV5BMDExODM1MjItNDA1Zi00NGQ3LTkwYTctNmFhODhkNjRmNzJkXkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg",
    apiUrl: "https://games-news-api.vercel.app/marvelRivals/",
    source: "https://www.marvelrivals.com/news/",
  },
];

interface NewsRowProps {
  title: string;
  icon: React.ReactNode;
}

const NewsRow = React.memo(function NewsRow({ title, icon }: NewsRowProps) {
  const { t } = useLangStore();
  return (
    <section className="space-y-6">
      <h2 className="text-xl font-black text-white flex items-center gap-2">
        {icon}
        <span>{title}</span>
      </h2>

      <div className="flex gap-4 overflow-x-auto pb-4 px-1 scrollbar">
        {GAMES_DATA.map((game) => (
          <Link
            key={game.id}
            href={`/news?source=${game.name.toLowerCase()}`}
            className="group flex-shrink-0 w-[165px] h-[250px] rounded-[16px] overflow-hidden relative shadow-lg flex flex-col bg-gradient-to-b from-[#1a3052] to-[#0c1a33] border border-white/10 transition-transform duration-300 hover:-translate-y-1"
          >
            <div className="relative w-full h-[200px] z-0 overflow-hidden">
              <Image
                src={game.image}
                alt={game.name}
                fill
                sizes="165px"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute bottom-0 left-0 right-0 h-[50%] bg-gradient-to-t from-[#0b1426]/90 to-transparent z-10 pointer-events-none" />
            </div>

            <div className="flex-1 p-3 flex flex-col justify-center">
              <h3 className="text-white text-[15px] font-bold leading-[18px] text-center line-clamp-2">
                {game.name}
              </h3>
            </div>

            {/* LIVE Badge */}
            <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-[#0c1a33]/90 px-2 py-1 rounded-full border border-[#FF3B30] z-20">
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
})

export default NewsRow;
