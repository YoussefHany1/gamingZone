import { NewsGame } from "./types";

export const NEWS_GAMES_DATA: NewsGame[] = [
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

export const GAME_COUNTDOWN_LABELS = {
  en: { days: "Days", hours: "Hours", minutes: "Mins" },
  ar: { days: "أيام", hours: "ساعات", minutes: "دقائق" },
};

export const FREE_GAME_COUNTDOWN_LABELS = {
  en: {
    freeOn: "Free On Epic",
    days: "Days",
    hours: "Hrs",
    minutes: "Min",
    seconds: "Sec",
  },
  ar: {
    freeOn: "مجاني قريباً",
    days: "أيام",
    hours: "ساعات",
    minutes: "دقائق",
    seconds: "ثواني",
  },
};
