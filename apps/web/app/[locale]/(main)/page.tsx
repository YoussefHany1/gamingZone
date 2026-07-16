import { Metadata } from "next";

import Slideshow from "@/features/home/components/Slideshow";
import WeeklyRecap from "@/features/home/components/WeeklyRecap";
import GamingEvents from "@/features/home/components/GamingEvents";
import LatestNewsFeed from "@/features/home/components/LatestNewsFeed";
import ChatBubble from "@/components/ChatBubble";
import AppAdvertisement from "@/features/home/components/AppAdvertisement";
import { fetchServerArticles, fetchServerWeeklySummary } from "@/features/news";
import { fetchGamingEvents } from "@/features/events";

export const revalidate = 600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  if (locale === "en") {
    return {
      title: "Gaming Zone | News, Game Tracker & Free Games",
      description:
        "Your ultimate destination for gaming news, game tracker and free games alerts. Join our community of gamers and stay updated with the latest trends in the world of gaming.",
      openGraph: {
        title: "Gaming Zone | News, Game Tracker & Free Games",
        description:
          "Your ultimate destination for gaming news, game tracker and free games alerts. Join our community of gamers and stay updated with the latest trends in the world of gaming.",
        images: [
          {
            url: "/assets/cover2.png",
            width: 1024,
            height: 500,
            alt: "Gaming Zone Banner",
          },
        ],
        locale: "en_US",
        type: "website",
      },
    };
  }

  return {
    title: "Gaming Zone | أخبار، مراجعات، ألعاب مجانية",
    description:
      "الموقع العربي الأول لمتابعة أخبار ألعاب الفيديو، المراجعات، فعاليات وعروض الألعاب المجانية، وتنظيم قوائم ومكتبة ألعابك المفضلة.",
    openGraph: {
      title: "Gaming Zone | أخبار، مراجعات، ألعاب مجانية",
      description:
        "الموقع العربي الأول لمتابعة أخبار ألعاب الفيديو، المراجعات، فعاليات وعروض الألعاب المجانية، وتنظيم قوائم ومكتبة ألعابك المفضلة.",
      images: [
        {
          url: "/assets/cover2.png",
          width: 1024,
          height: 500,
          alt: "Gaming Zone Banner",
        },
      ],
      locale: "ar_EG",
      type: "website",
    },
  };
}

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
  ] = await Promise.all([
    fetchServerArticles("news", locale),
    fetchServerArticles("reviews", locale),
    fetchServerArticles("esports", locale),
    fetchServerArticles("hardware", locale),
    fetchServerWeeklySummary(),
    fetchGamingEvents(),
  ]);

  return (
    <div className="w-full flex flex-col text-white relative">
      {/* Navigation Header */}

      {/* Main Home Container */}
      <main className="grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-2">
        <Slideshow />

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

        {/* Placeholder for AD 2 */}
        {/* <div className="w-full flex items-center justify-center my-8 py-4 opacity-50">
          <span className="text-gray-500 text-xs tracking-widest uppercase border border-gray-600/30 px-4 py-2 rounded-lg">
            Advertisement Placeholder
          </span>
        </div> */}

        <LatestNewsFeed
          category="esports"
          initialArticles={esportsArticles}
          locale={locale}
        />

        {/* Placeholder for AD 3 */}
        {/* <div className="w-full flex items-center justify-center my-8 py-4 opacity-50">
          <span className="text-gray-500 text-xs tracking-widest uppercase border border-gray-600/30 px-4 py-2 rounded-lg">
            Advertisement Placeholder
          </span>
        </div> */}

        <LatestNewsFeed
          category="hardware"
          initialArticles={hardwareArticles}
          locale={locale}
        />
      </main>

      {/* Floating pulsing chatbot bubbles */}
      <ChatBubble />

      {/* Footer */}
    </div>
  );
}
