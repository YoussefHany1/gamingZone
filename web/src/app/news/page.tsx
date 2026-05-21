import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Metadata } from "next";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { databases } from "../../lib/appwrite";
import { Query } from "appwrite";
import { Newspaper, Calendar, ArrowRight, Layers } from "lucide-react";
import SourceDropdown from "../../components/news/SourceDropdown";
import TimeAgoClient from "../../components/news/TimeAgoClient";

interface Article {
  $id: string;
  title: string;
  thumbnail?: string;
  siteName: string;
  pubDate: string;
  category: string;
  description?: string;
}

function getTimeAgo(dateStr: string, lang: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  const rtf = new Intl.RelativeTimeFormat(lang === "ar" ? "ar-EG" : "en-US", {
    numeric: "auto",
  });

  let interval = seconds / 31536000;
  if (interval >= 1) return rtf.format(-Math.floor(interval), "year");
  interval = seconds / 2592000;
  if (interval >= 1) return rtf.format(-Math.floor(interval), "month");
  interval = seconds / 86400;
  if (interval >= 1) return rtf.format(-Math.floor(interval), "day");
  interval = seconds / 3600;
  if (interval >= 1) return rtf.format(-Math.floor(interval), "hour");
  interval = seconds / 60;
  if (interval >= 1) return rtf.format(-Math.floor(interval), "minute");

  return rtf.format(-Math.floor(seconds || 1), "second");
}

export const metadata: Metadata = {
  title: "أخبار الألعاب، المراجعات والرياضات الإلكترونية | Gaming Zone",
  description:
    "تابع تغطية فورية لأحدث أخبار الألعاب، مراجعات الأجهزة والقطع، بطولات الرياضات الإلكترونية Esports وأكثر من أفضل المصادر العربية والعالمية.",
  openGraph: {
    title: "أخبار الألعاب، المراجعات والرياضات الإلكترونية | Gaming Zone",
    description:
      "تابع تغطية فورية لأحدث أخبار الألعاب، مراجعات الأجهزة والقطع، بطولات الرياضات الإلكترونية Esports وأكثر من أفضل المصادر العربية والعالمية.",
    images: [
      {
        url: "/assets/cover2.png",
        width: 1024,
        height: 500,
        alt: "Gaming Zone Banner",
      },
    ],
    siteName: "Gaming Zone",
    type: "website",
  },
};

async function fetchNewsSources(
  category: string,
): Promise<{ name: string; language: string; image?: string }[]> {
  try {
    const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "";
    const COLLECTION_ID = "news_sources";

    if (!DATABASE_ID) return [];

    const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [
      Query.equal("category", category),
      Query.limit(100),
    ]);

    return response.documents.map((doc: any) => ({
      name: doc.name,
      language: doc.language || "en",
      image: doc.image,
    }));
  } catch (error) {
    console.error("Error loading news sources in Server Component:", error);
    return [];
  }
}

async function fetchNews(
  category: string,
  siteName: string,
): Promise<Article[]> {
  try {
    const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "";
    const COLLECTION_ID = "articles";

    if (!DATABASE_ID) return [];

    const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [
      Query.equal("siteName", siteName),
      Query.equal("category", category),
      Query.orderDesc("pubDate"),
      Query.limit(50),
    ]);

    return response.documents as unknown as Article[];
  } catch (error) {
    console.error("Error loading news in Server Component:", error);
    return [];
  }
}

export default async function NewsPage(props: {
  searchParams: Promise<{ category?: string; source?: string }>;
}) {
  const searchParams = await props.searchParams;
  const currentCategory = searchParams.category || "news";

  // 1. Fetch available sources dynamically
  const sources = await fetchNewsSources(currentCategory);

  // 2. Select default source
  let defaultSource = "";
  if (sources.length > 0) {
    defaultSource = sources[0].name;
  }

  const currentSource = searchParams.source || defaultSource;
  const articles = await fetchNews(currentCategory, currentSource);

  // Dynamic label helpers
  const categoriesList = [
    { id: "news", en: "News", ar: "أخبار" },
    { id: "reviews", en: "Reviews", ar: "مراجعات" },
    { id: "esports", en: "Esports", ar: "رياضة إلكترونية" },
    { id: "hardware", en: "Hardware", ar: "قطع وأجهزة" },
  ];

  const activeLang =
    sources.find((s) => s.name === currentSource)?.language || "ar";

  return (
    <div className="min-h-screen flex flex-col text-white">
      <Header />

      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* News Header Card */}
        <div className="glass-panel border border-white/10 p-6 rounded-3xl flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-tr from-light-blue to-secondary-blue rounded-2xl text-white">
              <Newspaper className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-white to-light-blue bg-clip-text text-transparent">
                {activeLang === "ar"
                  ? "أخبار ومقالات الألعاب"
                  : "Gaming News & Articles"}
              </h1>
              {/* <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-light-blue" />
                <span>
                  {activeLang === "ar"
                    ? `تصفح قسم: ${categoriesList.find((c) => c.id === currentCategory)?.ar} من المصدر: ${currentSource}`
                    : `Section: ${categoriesList.find((c) => c.id === currentCategory)?.en} | Source: ${currentSource}`}
                </span>
              </p> */}
            </div>
          </div>

          {/* Dynamic Sources Custom Dropdown Menu */}
          {sources.length > 0 && (
            <SourceDropdown
              sources={sources}
              currentSource={currentSource}
              currentCategory={currentCategory}
              activeLang={activeLang}
            />
          )}
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar border-b border-white/5">
          {categoriesList.map((cat) => (
            <Link
              key={cat.id}
              href={`/news?category=${cat.id}`}
              className={`px-5 py-3 rounded-t-xl text-xs sm:text-sm font-extrabold capitalize transition-all border-b-2 shrink-0 ${
                currentCategory === cat.id
                  ? "border-light-blue text-light-blue bg-light-blue/5"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              {activeLang === "ar" ? cat.ar : cat.en}
            </Link>
          ))}
        </div>

        {/* Articles List */}
        {articles.length === 0 ? (
          <div className="text-center py-20 text-gray-400 glass-panel border border-white/5 rounded-3xl shadow-lg">
            {activeLang === "ar"
              ? "لا توجد مقالات متوفرة في هذا القسم حالياً."
              : "No articles available in this section yet."}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {articles.map((art) => {
              const thumbnail = art.thumbnail || "/assets/image-not-found.webp";
              return (
                <Link
                  href={`/news/${art.$id}`}
                  key={art.$id}
                  className="group flex flex-col sm:flex-row gap-5 p-5 rounded-2xl glass-panel glass-panel-hover border border-white/10 shadow-md relative overflow-hidden transition-all hover:-translate-y-1"
                >
                  {/* Thumbnail */}
                  <div className="relative w-full sm:w-44 h-40 sm:h-auto rounded-xl overflow-hidden flex-shrink-0 z-0">
                    <Image
                      src={thumbnail}
                      alt={art.title}
                      fill
                      sizes="(max-width: 640px) 100vw, 176px"
                      className="object-cover transition-transform duration-500 group-hover:scale-105 bg-secondary-blue"
                    />
                    <span className="uppercase text-[9px] bg-black/15 px-2 py-0.5 rounded-xl border border-white/5 z-40 absolute bottom-1">
                      {art.siteName}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="flex flex-col justify-between flex-grow gap-4">
                    <div className="space-y-2.5">
                      <h2 className="font-extrabold text-sm sm:text-base text-white group-hover:text-light-blue transition-colors duration-300 leading-snug">
                        {art.title}
                      </h2>

                      {art.description && (
                        <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                          {art.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-gray-500 mt-auto pt-1">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-light-blue" />
                        <span className="font-semibold">
                          <TimeAgoClient
                            dateStr={art.pubDate}
                            format="timeAgo"
                          />
                        </span>
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
