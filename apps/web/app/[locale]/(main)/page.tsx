import Slideshow from "@/features/home/components/Slideshow";
import WeeklyRecap from "@/features/home/components/WeeklyRecap";
import GamingEvents from "@/features/home/components/GamingEvents";
import LatestNewsFeed from "@/features/home/components/LatestNewsFeed";
import ChatBubble from "@/components/ChatBubble";
import AppAdvertisement from "@/features/home/components/AppAdvertisement";
import { fetchServerArticles, fetchServerWeeklySummary } from "@/features/news";
import { getCachedGamingEvents } from "@/features/events/services/server";
import { fetchLatestTrailers } from "@/features/games/services/server";
import { createLocalizedMetadata } from "@/lib/metadata";

export const revalidate = 600;

export const generateMetadata = createLocalizedMetadata({
  en: {
    title: "Gaming Zone | News, Game Tracker & Free Games",
    description:
      "Your ultimate destination for gaming news, game tracker and free games alerts. Join our community of gamers and stay updated with the latest trends in the world of gaming.",
  },
  ar: {
    title: "Gaming Zone | أخبار، مراجعات، ألعاب مجانية",
    description:
      "الموقع العربي الأول لمتابعة أخبار ألعاب الفيديو، المراجعات، فعاليات وعروض الألعاب المجانية، وتنظيم قوائم ومكتبة ألعابك المفضلة.",
  },
});

export default async function Home(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;

  // Parallel fetch server side
  const [
    newsArticles,
    reviewsArticles,
    esportsArticles,
    hardwareArticles,
    weeklySummary,
    gamingEvents,
    latestTrailers,
  ] = await Promise.all([
    fetchServerArticles("news", locale),
    fetchServerArticles("reviews", locale),
    fetchServerArticles("esports", locale),
    fetchServerArticles("hardware", locale),
    fetchServerWeeklySummary(),
    getCachedGamingEvents(),
    fetchLatestTrailers(),
  ]);

  return (
    <div className="w-full flex flex-col text-white relative">
      <main className="grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-2">
        <Slideshow initialTrailers={latestTrailers} />

        <LatestNewsFeed
          category="news"
          initialArticles={newsArticles}
          locale={locale}
        />

        {/* App Advertisement Section */}
        <AppAdvertisement locale={locale} />

        <WeeklyRecap initialSummary={weeklySummary} />

        <LatestNewsFeed
          category="reviews"
          initialArticles={reviewsArticles}
          locale={locale}
        />

        <GamingEvents initialEvents={gamingEvents} />

        <LatestNewsFeed
          category="esports"
          initialArticles={esportsArticles}
          locale={locale}
        />

        <LatestNewsFeed
          category="hardware"
          initialArticles={hardwareArticles}
          locale={locale}
        />
      </main>

      {/* Floating pulsing chatbot bubbles */}
      <ChatBubble />
    </div>
  );
}
