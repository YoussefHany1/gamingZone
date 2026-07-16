import React from "react";
import Link from "@/components/Link";
import Image from "next/image";

import { Newspaper, Calendar } from "lucide-react";
import SourceDropdown from "./SourceDropdown";
import TimeAgoClient from "./TimeAgoClient";
import { Article } from "@/types";
import { Card } from "@/components/ui/Card";
import { GradientText } from "@/components/ui/GradientText";
import { getTranslations } from "@/i18n/server";

interface NewsListProps {
  currentCategory: string;
  currentSource: string;
  sources: { name: string; language: string; image?: string }[];
  articles: Article[];
  locale?: string;
}

export default function NewsList({
  currentCategory,
  currentSource,
  sources,
  articles,
  locale = "ar",
}: NewsListProps) {
  const t = getTranslations(locale);

  // Dynamic label helpers
  const categoriesList = [
    { id: "news", label: t("home.sections.news") || "News" },
    { id: "reviews", label: t("home.sections.reviews") || "Reviews" },
    { id: "esports", label: t("home.sections.esports") || "Esports" },
    { id: "hardware", label: t("home.sections.hardware") || "Hardware" },
  ];

  return (
    <div className="w-full flex flex-col text-white">
      <main className="grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* News Header Card */}
        <Card className="p-6 rounded-3xl flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-linear-to-tr from-light-blue to-secondary-blue rounded-2xl text-white">
              <Newspaper className="w-6 h-6" />
            </div>
            <div>
              <GradientText as="h1" className="text-xl sm:text-2xl font-black">
                {t("home.newsFeed.title") || "Gaming News & Articles"}
              </GradientText>
            </div>
          </div>

          {/* Dynamic Sources Custom Dropdown Menu */}
          {sources.length > 0 && (
            <SourceDropdown
              sources={sources}
              currentSource={currentSource}
              currentCategory={currentCategory}
              activeLang={locale}
            />
          )}
        </Card>

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
              {cat.label}
            </Link>
          ))}
        </div>

        {/* Articles List */}
        {articles.length === 0 ? (
          <Card className="text-center py-20 text-gray-400 rounded-3xl shadow-lg border-white/5">
            {t("news.details.nodescription") ||
              "No articles available in this section yet."}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {articles.map((art) => {
              const thumbnail = art.thumbnail || "/assets/image-not-found.webp";
              const artLang =
                sources.find((s) => s.name === art.siteName)?.language || "en";

              return (
                <Link href={`/news/${art.$id}`} key={art.$id}>
                  <Card
                    hoverEffect
                    dir={artLang === "ar" ? "rtl" : "ltr"}
                    className="group flex flex-col sm:flex-row gap-5 p-5 shadow-md relative overflow-hidden hover:-translate-y-1"
                  >
                    {/* Thumbnail */}
                    <div className="relative w-full sm:w-44 h-40 sm:h-auto rounded-xl overflow-hidden shrink-0 z-0">
                      <Image
                        src={thumbnail.replace(/&amp;/g, '&')}
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
                    <div className="flex flex-col justify-between grow gap-4">
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
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
