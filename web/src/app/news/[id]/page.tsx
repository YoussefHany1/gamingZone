import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Metadata } from "next";
import Header from "../../../components/Header";
import Footer from "../../../components/Footer";
import { databases } from "../../../lib/appwrite";
import { Calendar, Globe, ArrowLeft, Clock } from "lucide-react";
import TimeAgoClient from "../../../components/news/TimeAgoClient";

interface Article {
  language: string;
  link: any;
  $id: string;
  title: string;
  thumbnail?: string;
  siteName: string;
  pubDate: string;
  category: string;
  description?: string;
  url?: string;
}

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "";
const COLLECTION_ID = "articles";

// 1. Dynamic OG Metadata Generator
export async function generateMetadata(props: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const id = params.id;

  try {
    const art = (await databases.getDocument(
      DATABASE_ID,
      COLLECTION_ID,
      id,
    )) as unknown as Article;

    return {
      title: `${art.title} | Gaming Zone`,
      description: art.description || "اقرأ الخبر كامل على جيمنج زون.",
      openGraph: {
        title: art.title,
        description: art.description || "تفاصيل الخبر من جيمنج زون.",
        images: [
          {
            url:
              art.thumbnail ||
              "https://images.igdb.com/igdb/image/upload/t_screenshot_med/sc8z2q.webp",
            alt: art.title,
          },
        ],
        type: "article",
        siteName: "Gaming Zone",
      },
    };
  } catch (error) {
    console.error("Error generating metadata for news details:", error);
    return {
      title: "تفاصيل الخبر | Gaming Zone",
    };
  }
}

// 2. Server Component Page Render
export default async function NewsDetailsPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const id = params.id;

  let art: Article | null = null;

  try {
    art = (await databases.getDocument(
      DATABASE_ID,
      COLLECTION_ID,
      id,
    )) as unknown as Article;
  } catch (error) {
    console.error("Error fetching article in server component:", error);
  }

  if (!art) {
    return (
      <div className="min-h-screen flex flex-col text-white">
        <Header />
        <main className="flex-grow flex flex-col justify-center items-center gap-4 py-20 text-center">
          <h2 className="text-xl font-bold text-gray-300">
            الخبر غير موجود أو حدث خطأ أثناء التحميل
          </h2>
          <Link
            href="/news"
            className="px-5 py-2.5 bg-light-blue rounded-xl text-sm font-semibold"
          >
            العودة للأخبار
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const activeLang = art.siteName === "destructoid" ? "en" : "ar";
  console.log(art);
  return (
    <div className="min-h-screen flex flex-col text-white">
      <Header />

      <main className="flex-grow max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
        {/* Back navigation */}
        <Link
          href="/news"
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4 rtl-flip" />
          <span>{activeLang === "ar" ? "العودة للأخبار" : "Back to News"}</span>
        </Link>

        {/* Detailed Container */}
        <article className="glass-panel border border-white/10 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl relative">
          {/* Header Metadata */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-light-blue" />
                <TimeAgoClient dateStr={art.pubDate} format="date" />
              </span>
              <span className="flex items-center gap-1.5 capitalize bg-white/5 border border-white/5 px-2.5 py-0.5 rounded-lg text-light-blue font-semibold">
                {art.siteName}
              </span>
              <span className="px-2.5 py-0.5 rounded-lg bg-light-blue/15 text-light-blue font-bold text-[10px] uppercase">
                {art.category}
              </span>
            </div>

            <h1
              className={`text-xl sm:text-2xl md:text-3xl font-black text-white leading-tight ${art.language === "ar" ? "text-right font-cairo" : "text-left font-outfit"}`}
            >
              {art.title}
            </h1>
          </div>

          {/* Thumbnail Cover */}
          <div className="relative w-full h-64 sm:h-[400px] rounded-2xl overflow-hidden shadow-lg border border-white/5 z-0">
            <Image
              src={art.thumbnail || "/assets/image-not-found.webp"}
              alt={art.title}
              fill
              priority
              className="object-cover bg-secondary-blue"
            />
          </div>

          {/* Article Description / Body */}
          <div
            className={`text-sm sm:text-base text-gray-300 leading-relaxed space-y-4 pt-4 border-t border-white/5 ${
              art.language === "ar"
                ? "font-cairo text-right"
                : "font-outfit text-left"
            }`}
          >
            {art.description ? (
              // Renders clean paragraph text. If html content is found, dangerouslySetInnerHTML handles it beautifully
              art.description.includes("<p>") ||
              art.description.includes("<div>") ? (
                <div
                  dangerouslySetInnerHTML={{ __html: art.description }}
                  className="prose prose-invert max-w-none text-gray-300"
                ></div>
              ) : (
                <p
                  className={`whitespace-pre-line leading-relaxed ${art.language === "ar" ? "text-right" : "text-left"}`}
                >
                  {art.description}
                </p>
              )
            ) : (
              <p className="text-gray-500 italic">
                {activeLang === "ar"
                  ? "لا يوجد تفاصيل إضافية متوفرة"
                  : "No additional description available."}
              </p>
            )}
          </div>

          {/* Visit Original Link */}
          {art.link && (
            <div className="pt-6 border-t border-white/5 flex justify-end w-full">
              <a
                href={art.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 w-full mx-12 justify-center px-5 py-3 bg-gradient-to-r from-secondary-blue to-light-blue hover:opacity-95 active:scale-95 text-md font-bold text-white rounded-xl shadow-lg shadow-light-blue/15 transition-all"
              >
                <Globe className="w-5 h-5" />
                <span>
                  {activeLang === "ar"
                    ? "زيارة الموقع الأصلي للمقال"
                    : "Visit Original Source"}
                </span>
              </a>
            </div>
          )}
        </article>
      </main>

      <Footer />
    </div>
  );
}
