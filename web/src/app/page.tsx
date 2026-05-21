import React from "react";
import { Metadata } from "next";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Slideshow from "../components/home/Slideshow";
import WeeklyRecap from "../components/home/WeeklyRecap";
import GamingEvents from "../components/home/GamingEvents";
import LatestNewsFeed from "../components/home/LatestNewsFeed";
import ChatBubble from "../components/ChatBubble";
import AppAdvertisement from "../components/home/AppAdvertisement";

export const metadata: Metadata = {
  title: "Gaming Zone | مجتمع اللاعبين العربي - أخبار، مراجعات، ألعاب مجانية",
  description:
    "الموقع العربي الأول لمتابعة أخبار ألعاب الفيديو، المراجعات، فعاليات وعروض الألعاب المجانية، وتنظيم قوائم ومكتبة ألعابك المفضلة.",
  openGraph: {
    title: "Gaming Zone | مجتمع اللاعبين العربي - أخبار، مراجعات، ألعاب مجانية",
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

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col text-white relative">
      {/* Navigation Header */}
      <Header />

      {/* Main Home Container */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-2">
        <Slideshow />

        <LatestNewsFeed category="news" />

        <WeeklyRecap />

        {/* App Advertisement Section */}
        <AppAdvertisement />

        <LatestNewsFeed category="reviews" />

        <GamingEvents />

        {/* Placeholder for AD 2 */}
        <div className="w-full flex items-center justify-center my-8 py-4 opacity-50">
          <span className="text-gray-500 text-xs tracking-widest uppercase border border-gray-600/30 px-4 py-2 rounded-lg">
            Advertisement Placeholder
          </span>
        </div>

        <LatestNewsFeed category="esports" />

        {/* Placeholder for AD 3 */}
        <div className="w-full flex items-center justify-center my-8 py-4 opacity-50">
          <span className="text-gray-500 text-xs tracking-widest uppercase border border-gray-600/30 px-4 py-2 rounded-lg">
            Advertisement Placeholder
          </span>
        </div>

        <LatestNewsFeed category="hardware" />
      </main>

      {/* Floating pulsing chatbot bubbles */}
      <ChatBubble />

      {/* Footer */}
      <Footer />
    </div>
  );
}
