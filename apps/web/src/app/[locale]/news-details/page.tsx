import React from "react";
import Image from "next/image";
import Link from "@/components/Link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Calendar, Globe, ArrowLeft } from "lucide-react";
import TimeAgoClient from "@/components/news/TimeAgoClient";

interface SearchParams {
  title?: string;
  link?: string;
  thumbnail?: string;
  siteName?: string;
  siteImage?: string;
  pubDate?: string;
  description?: string;
}

export default async function NewsDetailsFallbackPage(props: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  
  const locale = params.locale;
  const title = searchParams.title || "";
  const link = searchParams.link || "";
  const thumbnail = searchParams.thumbnail || "";
  const siteName = searchParams.siteName || "Gaming Zone";
  const pubDate = searchParams.pubDate || new Date().toISOString();
  const description = searchParams.description || "";

  const activeLang = siteName.toLowerCase() === "destructoid" ? "en" : "ar";
  const isArabic = locale === "ar" || activeLang === "ar";

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
          <span>{isArabic ? "العودة للأخبار" : "Back to News"}</span>
        </Link>

        {/* Detailed Container */}
        <article className="glass-panel border border-white/10 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl relative">
          {/* Header Metadata */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-light-blue" />
                <TimeAgoClient dateStr={pubDate} format="date" />
              </span>
              <span className="flex items-center gap-1.5 capitalize bg-white/5 border border-white/5 px-2.5 py-0.5 rounded-lg text-light-blue font-semibold">
                {siteName}
              </span>
              <span className="px-2.5 py-0.5 rounded-lg bg-light-blue/15 text-light-blue font-bold text-[10px] uppercase">
                {isArabic ? "مشاركة" : "SHARED"}
              </span>
            </div>

            <h1
              className={`text-xl sm:text-2xl md:text-3xl font-black text-white leading-tight ${isArabic ? "text-right font-cairo" : "text-left font-outfit"}`}
            >
              {title}
            </h1>
          </div>

          {/* Thumbnail Cover */}
          <div className="relative w-full h-64 sm:h-[400px] rounded-2xl overflow-hidden shadow-lg border border-white/5 z-0">
            <Image
              src={thumbnail || "/assets/image-not-found.webp"}
              alt={title}
              fill
              priority
              className="object-cover bg-secondary-blue"
            />
          </div>

          {/* Article Description / Body */}
          <div
            className={`text-sm sm:text-base text-gray-300 leading-relaxed space-y-4 pt-4 border-t border-white/5 ${
              isArabic ? "font-cairo text-right" : "font-outfit text-left"
            }`}
          >
            {description ? (
              <p className="whitespace-pre-line leading-relaxed">
                {description}
              </p>
            ) : (
              <p className="text-gray-500 italic">
                {isArabic
                  ? "لا يوجد تفاصيل إضافية متوفرة"
                  : "No additional description available."}
              </p>
            )}
          </div>

          {/* Visit Original Link */}
          {link && (
            <div className="pt-6 border-t border-white/5 flex justify-end w-full">
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 w-full mx-12 justify-center px-5 py-3 bg-gradient-to-r from-secondary-blue to-light-blue hover:opacity-95 active:scale-95 text-md font-bold text-white rounded-xl shadow-lg shadow-light-blue/15 transition-all"
              >
                <Globe className="w-5 h-5" />
                <span>
                  {isArabic ? "زيارة الموقع الأصلي للمقال" : "Visit Original Source"}
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
