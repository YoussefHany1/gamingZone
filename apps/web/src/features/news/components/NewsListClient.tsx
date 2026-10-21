"use client";

import { useEffect, useState, useRef } from "react";
import Link from "@/components/Link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Newspaper, Calendar } from "lucide-react";
import SourceDropdown from "./SourceDropdown";
import TimeAgoClient from "./TimeAgoClient";
import { Source } from "../types";
import { Card } from "@/components/ui/Card";
import { createTranslator } from "@/i18n/translate";
import { getArticleSummary } from "@gaming-zone/utils";
import { Article } from "@/types";
import { databases } from "@/lib/appwrite";
import { Query } from "appwrite";

interface NewsListClientProps {
  currentCategory: string;
  sources: Source[];
  /** Locale-appropriate source selected server-side; "" when the registry is empty. */
  defaultSource: string;
  /** Article list already rendered on the server for `defaultSource`. */
  initialArticles: Article[];
  locale?: string;
}

/**
 * Mirrors the server-side fetch in isNewsCategorySlug's page: same limit, the
 * same fields selected from Appwrite, etc. The server render covers the
 * locale-default source; switching sources here goes straight to Appwrite from
 * the browser, so no Vercel function is invoked — the page itself stays a
 * static/ISR shell regardless of ?source=.
 */
const ARTICLE_FIELDS = [
  "$id",
  "title",
  "description",
  "thumbnail",
  "pubDate",
  "siteName",
  "link",
  "category",
  "language",
  "summary_en",
  "summary_ar",
  "summary_es",
  "summary_fr",
  "summary_hi",
  "summary_pt_br",
  "summary_pt_pt",
];

export default function NewsListClient({
  currentCategory,
  sources,
  defaultSource,
  initialArticles,
  locale = "ar",
}: NewsListClientProps) {
  const t = createTranslator(locale);

  const searchParams = useSearchParams();
  // Sources are keyed by exact registry name; a junk ?source= degrades to the
  // locale default instead of minting an empty feed (same contract the server
  // page used to apply against searchParams).
  const requestedSource = searchParams.get("source") || "";
  const effectiveSource = sources.some((s) => s.name === requestedSource)
    ? requestedSource
    : defaultSource;

  const [articles, setArticles] = useState<Article[]>(initialArticles);
  const [currentSource, setCurrentSource] = useState(effectiveSource);
  const [switching, setSwitching] = useState(false);

  // Results fetched client-side per source, memoised so toggling back and
  // forth does not re-hit Appwrite.
  const fetchedRef = useRef<PageFromMap>(new Map());

  useEffect(() => {
    if (effectiveSource === currentSource) return;
    if (!effectiveSource) return;

    const cached = fetchedRef.current.get(effectiveSource);
    if (cached) {
      setArticles(cached);
      setCurrentSource(effectiveSource);
      return;
    }

    let isCancelled = false;
    setSwitching(true);

    async function fetchSourceFeed() {
      try {
        const DATABASE_ID =
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "";
        if (!DATABASE_ID) return;

        const response = await databases.listDocuments(DATABASE_ID, "articles", [
          Query.equal("siteName", effectiveSource),
          Query.equal("category", currentCategory),
          Query.orderDesc("pubDate"),
          Query.limit(50),
          Query.select(ARTICLE_FIELDS),
        ]);

        if (isCancelled) return;
        const parsed = JSON.parse(JSON.stringify(response.documents)) as Article[];
        fetchedRef.current.set(effectiveSource, parsed);
        setArticles(parsed);
        setCurrentSource(effectiveSource);
      } catch (error) {
        console.error("Error loading news source feed:", error);
      } finally {
        if (!isCancelled) setSwitching(false);
      }
    }

    fetchSourceFeed();
    return () => {
      isCancelled = true;
    };
  }, [effectiveSource, currentSource, currentCategory]);

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
            <div className="p-3 rounded-2xl text-white">
              <Newspaper className="w-6 h-6 text-light-blue" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white">
                {t("news.newsHeader") || "Gaming News & Articles"}
              </h1>
            </div>
          </div>

          {/* Dynamic Sources Custom Dropdown Menu — pushes ?source= which this
              component resolves against the registry (and fetches client-side
              when it is not the locale default). */}
          {sources.length > 0 && (
            <SourceDropdown
              sources={sources}
              currentSource={currentSource}
              currentCategory={currentCategory}
              activeLang={locale}
            />
          )}
        </Card>

        {/* Category Tabs — path segments now, so each tab is a prerendered page. */}
        <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar border-b border-white/5">
          {categoriesList.map((cat) => (
            <Link
              key={cat.id}
              href={`/news/${cat.id}`}
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
          <div
            className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-opacity duration-150 ${
              switching ? "opacity-50 pointer-events-none" : "opacity-100"
            }`}
          >
            {articles.map((art) => {
              const thumbnail = art.thumbnail || "/assets/image-not-found.webp";
              const artLang =
                sources.find((s) => s.name === art.siteName)?.language || "en";
              // Prefer the AI summary (in the active locale); fall back to the
              // raw description when it hasn't been generated yet.
              const summary = getArticleSummary(art, locale) || art.description;

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
                        src={thumbnail.replace(/&amp;/g, "&")}
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

                        {summary && (
                          <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                            {summary}
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

type PageFromMap = Map<string, Article[]>;
