import Link from "@/components/Link";
import { Metadata } from "next";

import { getArticle, getNewsSource, NewsDetailsLayout } from "@/features/news";
import { fetchServerArticles } from "@/features/news/services/api";
import { getTranslations } from "@/i18n/server";
import { getSiteBaseUrl } from "@/lib/metadata";

const NEWS_CATEGORIES = ["news", "reviews", "esports", "hardware"] as const;

// Prerender the newest articles (from every category) so detail pages are
// served from the Vercel CDN instead of running a function on every request.
//
// Article bodies are immutable once published, so a long window is free
// freshness-wise. The long revalidate is a safety net only — .github/workflows/
// trigger-rss.yml calls /api/revalidate the moment new articles land, so a
// freshly published article is served immediately. Dropping the prerendered
// set from 24 to 12 also halves the ISR write surface (24 ids x 2 locales).
export const revalidate = 21600; // 6h

const PRERENDERED_ARTICLE_LIMIT = 12;

export async function generateStaticParams() {
  try {
    // Only ids are needed, and ids are locale-independent, so one locale per
    // category is enough. The previous LOCALES cross-product doubled the
    // Appwrite queries at build time for identical output.
    const results = await Promise.all(
      NEWS_CATEGORIES.map((category) => fetchServerArticles(category, "en")),
    );
    const ids = [
      ...new Set(results.flat().map((art) => art.$id)),
    ].slice(0, PRERENDERED_ARTICLE_LIMIT);
    return ids.map((id) => ({ id }));
  } catch (error) {
    // Never swallow this silently: returning [] degrades every article page to a
    // cold dynamic render, which is an invocation on every request, not one per
    // 6h. The 6h revalidate still recovers the page on the next regeneration.
    console.error(
      "[news/[id]] generateStaticParams failed — no article pages will be " +
        "prerendered and every article hit will run a function:",
      error,
    );
    return [];
  }
}

// 1. Dynamic OG Metadata Generator
export async function generateMetadata(props: {
  params: Promise<{ id: string; locale: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const { id, locale } = params;

  try {
    const art = await getArticle(id);
    if (!art) {
      return {
        title:
          locale === "en"
            ? "News Details | Gaming Zone"
            : "تفاصيل الخبر | Gaming Zone",
      };
    }

    const canonicalUrl = `${getSiteBaseUrl()}/${locale}/news/${id}`;

    return {
      title: `Gaming Zone | ${art.title}`,
      description:
        art.description ||
        (locale === "en"
          ? "Read the article on Gaming Zone."
          : "اقرأ المقال على جيمنج زون."),
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        title: art.title,
        description:
          art.description ||
          (locale === "en"
            ? "News details from Gaming Zone."
            : "تفاصيل الخبر من جيمنج زون."),
        images: [
          {
            url: art.thumbnail || "/assets/cover2.png",
            alt: art.title,
          },
        ],
        type: "article",
        siteName: "Gaming Zone",
      },
      twitter: {
        card: "summary_large_image",
        title: art.title,
        description:
          art.description ||
          (locale === "en"
            ? "News details from Gaming Zone."
            : "تفاصيل الخبر من جيمنج زون."),
        images: [art.thumbnail || "/assets/cover2.png"],
      },
    };
  } catch (error) {
    console.error("Error generating metadata for news details:", error);
    return {
      title:
        locale === "en"
          ? "News Details | Gaming Zone"
          : "تفاصيل الخبر | Gaming Zone",
    };
  }
}

// 2. Server Component Page Render
export default async function NewsDetailsPage(props: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const params = await props.params;
  const { id, locale } = params;

  const art = await getArticle(id);

  if (!art) {
    const t = getTranslations(locale);

    return (
      <div className="w-full flex flex-col text-white">
        <main className="grow flex flex-col justify-center items-center gap-4 py-20 text-center">
          <h2 className="text-xl font-bold text-gray-300">
            {t("auth.errors.general")}
          </h2>
          <Link
            href="/news"
            className="px-5 py-2.5 bg-light-blue rounded-xl text-sm font-semibold"
          >
            {t("news.backToNews")}
          </Link>
        </main>
      </div>
    );
  }

  let sourceImage = undefined;
  if (art.siteName) {
    const source = await getNewsSource(art.siteName);
    sourceImage = source?.image;
  }

  const baseUrl = getSiteBaseUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: art.title,
    image: [art.thumbnail || `${baseUrl}/assets/cover2.png`],
    datePublished: art.pubDate,
    author: [
      {
        "@type": "Organization",
        name: art.siteName || "Gaming Zone",
        url: `${baseUrl}/${locale}/news/${id}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <NewsDetailsLayout art={art} sourceImage={sourceImage} locale={locale} />
    </>
  );
}
