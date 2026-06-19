import React from "react";
import { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Slideshow from "@/components/home/Slideshow";
import WeeklyRecap from "@/components/home/WeeklyRecap";
import GamingEvents from "@/components/home/GamingEvents";
import LatestNewsFeed from "@/components/home/LatestNewsFeed";
import ChatBubble from "@/components/ChatBubble";
import AppAdvertisement from "@/components/home/AppAdvertisement";
import { databases } from "@/lib/appwrite";
import { Query } from "appwrite";

export const revalidate = 600;

async function fetchServerArticles(category: string, lang: string) {
  try {
    const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "";
    const COLLECTION_ID = "articles";
    if (!DATABASE_ID) return [];

    const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [
      Query.equal("category", category),
      Query.equal("language", lang),
      Query.orderDesc("pubDate"),
      Query.limit(6),
    ]);
    return response.documents as any[];
  } catch (error) {
    console.error(`Error fetching server articles for ${category}:`, error);
    return [];
  }
}

async function fetchServerWeeklySummary() {
  try {
    const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "";
    const COLLECTION_ID = "weekly_summaries";
    if (!DATABASE_ID) return null;

    const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [
      Query.orderDesc("$createdAt"),
      Query.limit(1),
    ]);
    return response.documents.length > 0 ? response.documents[0] : null;
  } catch (error) {
    console.error("Error fetching server weekly summary:", error);
    return null;
  }
}

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
      icons: {
        icon: "/assets/icon.webp",
      },
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
    icons: {
      icon: "/assets/icon.webp",
    },
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
    newsArticlesRaw,
    reviewsArticlesRaw,
    esportsArticlesRaw,
    hardwareArticlesRaw,
    weeklySummaryRaw,
  ] = await Promise.all([
    fetchServerArticles("news", locale),
    fetchServerArticles("reviews", locale),
    fetchServerArticles("esports", locale),
    fetchServerArticles("hardware", locale),
    fetchServerWeeklySummary(),
  ]);

  // Safely serialize database model classes/null prototype objects into plain JSON objects for RSC boundary
  const newsArticles = JSON.parse(JSON.stringify(newsArticlesRaw));
  const reviewsArticles = JSON.parse(JSON.stringify(reviewsArticlesRaw));
  const esportsArticles = JSON.parse(JSON.stringify(esportsArticlesRaw));
  const hardwareArticles = JSON.parse(JSON.stringify(hardwareArticlesRaw));
  const weeklySummary = JSON.parse(JSON.stringify(weeklySummaryRaw));

  return (
    <div className="min-h-screen flex flex-col text-white relative">
      {/* Navigation Header */}
      <Header />

      {/* Main Home Container */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-2">
        <Slideshow />

        <LatestNewsFeed category="news" initialArticles={newsArticles} locale={locale} />

        <WeeklyRecap initialSummary={weeklySummary as any} />

        {/* App Advertisement Section */}
        <AppAdvertisement />

        <LatestNewsFeed category="reviews" initialArticles={reviewsArticles} locale={locale} />

        <GamingEvents />

        {/* Placeholder for AD 2 */}
        <div className="w-full flex items-center justify-center my-8 py-4 opacity-50">
          <span className="text-gray-500 text-xs tracking-widest uppercase border border-gray-600/30 px-4 py-2 rounded-lg">
            Advertisement Placeholder
          </span>
        </div>

        <LatestNewsFeed category="esports" initialArticles={esportsArticles} locale={locale} />

        {/* Placeholder for AD 3 */}
        <div className="w-full flex items-center justify-center my-8 py-4 opacity-50">
          <span className="text-gray-500 text-xs tracking-widest uppercase border border-gray-600/30 px-4 py-2 rounded-lg">
            Advertisement Placeholder
          </span>
        </div>

        <LatestNewsFeed category="hardware" initialArticles={hardwareArticles} locale={locale} />
      </main>

      {/* Floating pulsing chatbot bubbles */}
      <ChatBubble />

      {/* Footer */}
      <Footer />
    </div>
  );
}
