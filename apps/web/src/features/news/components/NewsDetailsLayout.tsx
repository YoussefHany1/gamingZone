import Image from "next/image";
import Link from "@/components/Link";
import { Calendar, Globe, ArrowLeft } from "lucide-react";
import TimeAgoClient from "./TimeAgoClient";
import { Article } from "@/types";
import { Card } from "@/components/ui/Card";
import { getTranslations } from "@/i18n/server";

interface NewsDetailsLayoutProps {
  art: Article;
  sourceImage?: string;
  locale: string;
}

export default function NewsDetailsLayout({
  art,
  sourceImage,
  locale,
}: NewsDetailsLayoutProps) {
  const t = getTranslations(locale);

  return (
    <div className="w-full flex flex-col text-white">
      <main className="grow max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
        {/* Back navigation */}
        <Link
          href="/news"
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4 rtl-flip" />
          <span>{t("news.backToNews")}</span>
        </Link>

        {/* Detailed Container */}
        <Card className="rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl relative">
          {/* Header Metadata */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-light-blue" />
                <TimeAgoClient dateStr={art.pubDate} format="date" />
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
              src={
                art.thumbnail?.replace(/&amp;/g, "&") ||
                "/assets/image-not-found.webp"
              }
              alt={art.title}
              fill
              sizes="(max-width: 768px) 100vw, 896px"
              priority
              className="object-cover bg-secondary-blue"
            />
          </div>

          {/* Source Info */}
          <div
            dir={art.language === "ar" ? "rtl" : "ltr"}
            className="flex items-center gap-3 pt-4  border-t border-white/5"
          >
            {sourceImage ? (
              <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 bg-secondary-blue shadow-md">
                <Image
                  src={sourceImage.replace(/&amp;/g, "&")}
                  alt={art.siteName}
                  fill
                  sizes="40px"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-light-blue/20 flex items-center justify-center shrink-0 shadow-md">
                <span className="text-light-blue font-bold uppercase text-lg">
                  {art.siteName.charAt(0)}
                </span>
              </div>
            )}
            <span className="text-white font-bold capitalize text-base tracking-wide">
              {art.siteName}
            </span>
          </div>

          {/* Article Description / Body */}
          <div
            className={`text-sm sm:text-base text-gray-300 leading-relaxed space-y-4 ${
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
                {t("news.details.noDescription")}
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
                className="w-full mx-12 flex gap-2 items-center justify-center px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-semibold transition-colors"
              >
                <Globe className="w-5 h-5" />
                <span>{t("news.details.readFullArticle")}</span>
              </a>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
