"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "../../../components/Link";
import { useLatestNewsFeed } from "../hooks/useLatestNewsFeed";
import { useLangStore } from "../../../store/useLangStore";
import { Newspaper, ChevronRight, Calendar } from "lucide-react";
import { LatestNewsFeedProps } from "../types";
import { Card } from "@/components/ui/Card";
import { GradientText } from "@/components/ui/GradientText";

const LatestNewsFeed = React.memo(function LatestNewsFeed({
  category,
  initialArticles,
  locale,
}: LatestNewsFeedProps) {
  const { lang, t } = useLangStore();
  const activeLang = locale || lang;
  const { articles, loading, formatDate } = useLatestNewsFeed(category, activeLang, initialArticles);

  return (
    <section className="my-10">
      {/* Category Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-white/5 pb-4">
        <GradientText as="h2" className="text-2xl font-black flex items-center gap-2 px-4 sm:px-0">
          <Newspaper className="w-6 h-6 text-light-blue" />
          {t(`home.sections.${category}`)}
        </GradientText>
      </div>

      {/* Grid List */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 px-4 sm:px-0">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="h-64 rounded-2xl glass-panel animate-pulse bg-white/5"
            ></div>
          ))}
        </div>
      ) : articles.length === 0 ? (
        <Card className="text-center py-12 text-gray-400 rounded-2xl mx-4 sm:mx-0">
          {t("news.noArticles")}
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 px-4 sm:px-0">
          {articles.map((art, index) => {
            const thumbnail = art.thumbnail || "/assets/image-not-found.webp";
            return (
              <Card
                key={art.$id}
                hoverEffect
                className="group flex flex-col overflow-hidden relative p-0"
              >
                {/* Thumbnail */}
                <div className="relative w-full h-44 z-0 overflow-hidden shrink-0">
                  <Image
                    src={thumbnail}
                    alt={art.title}
                    fill
                    priority={index < 2}
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105 bg-secondary-blue"
                    onError={(e) => {
                      e.currentTarget.srcset = "";
                      e.currentTarget.src = "/assets/image-not-found.webp";
                    }}
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-dark-bg via-transparent to-transparent"></div>

                  {/* Category overlay */}
                  <span className="absolute top-3 left-3 bg-dark-bg/80 border border-white/10 px-2 py-0.5 rounded text-[10px] font-bold text-light-blue capitalize">
                    {art.category}
                  </span>
                </div>

                {/* Content */}
                <div className="p-5 flex flex-col justify-between grow gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-light-blue" />
                        <span>{formatDate(art.pubDate)}</span>
                      </span>
                      <span className="capitalize">{art.siteName}</span>
                    </div>
                    <h3 className="font-extrabold text-sm line-clamp-2 text-white group-hover:text-light-blue transition-colors duration-300">
                      {art.title}
                    </h3>
                  </div>

                  <Link
                    href={`/news/${art.$id}`}
                    className="flex items-center justify-center gap-1.5 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 rounded-xl text-xs font-bold text-white transition-all duration-300"
                  >
                    <span>{t("news.details.readFullArticle")}</span>
                    <ChevronRight className="w-4 h-4 rtl-flip text-light-blue" />
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
});

export default LatestNewsFeed;
