import Link from "@/components/Link";
import { Metadata } from "next";
import { Suspense } from "react";

import {
  getArticle,
  getNewsSource,
  NewsListClient,
  NewsDetailsLayout,
  getNewsPageData,
  isNewsCategorySlug,
  NEWS_CATEGORY_SLUGS,
} from "@/features/news";
import { fetchServerArticles } from "@/features/news/services/api";
import { getTranslations } from "@/i18n/server";
import { getSiteBaseUrl } from "@/lib/metadata";

// Prerender the newest articles (from every category) plus every category page
// so both are served from the Vercel CDN instead of running a function on every
// request. Article ids are 36-char hex and the four category slugs are plain
// words — they cannot collide — so one dynamic segment ([id], here effectively
// "slug") serves both without breaking established /news/<id> links.
//
// Article bodies are immutable once published, so they tolerate the category
// feed's shorter window comfortably: a daily regeneration that reproduces the
// previous bytes is free on Vercel (no ISR write), it only pays CPU.
export const revalidate = 86400;

const PRERENDERED_ARTICLE_LIMIT = 12;

export async function generateStaticParams() {
  // Category slugs are static constants; article ids come from Appwrite at
  // build time and are locale-independent, so one locale per category is
  // enough to collect ids. The previous LOCALES cross-product doubled the
  // Appwrite queries for identical output.
  const idParams = await Promise.all(
    NEWS_CATEGORY_SLUGS.map(async (category) => {
      try {
        const articles = await fetchServerArticles(category, "en");
        return articles.map((art) => art.$id);
      } catch (error) {
        console.error(
          `[news/[id]] generateStaticParams: ${category} failed:`,
          error,
        );
        return [];
      }
    }),
  )
    .then((lists) => lists.flat())
    .catch(() => []);

  const ids = [...new Set(idParams)].slice(0, PRERENDERED_ARTICLE_LIMIT);

  if (ids.length === 0) {
    // Never swallow this silently: with no prerendered paths every news hit is
    // a cold dynamic render, which is an invocation on every request, not one
    // per TTL window. The 24h revalidate still recovers each page on its next
    // regeneration, and the category pages are still prerendered.
    console.error(
      "[news/[id]] generateStaticParams got no article ids — article pages " +
        "will render on demand:",
    );
  }

  return [
    ...NEWS_CATEGORY_SLUGS.map((id) => ({ id })),
    ...ids.map((id) => ({ id })),
  ];
}

// Metadata and page render branch on the slug: a category word renders the
// category feed (sources + default source, client resolves ?source=), anything
// else is an article id.
export async function generateMetadata(props: {
  params: Promise<{ id: string; locale: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const { id, locale } = params;

  if (isNewsCategorySlug(id)) {
    const canonicalUrl = `${getSiteBaseUrl()}/${locale}/news/${id}`;
    return locale === "en"
      ? {
          title: "Gaming Zone | Gaming News, Reviews & Esports",
          description:
            "Follow instant coverage of the latest gaming news, hardware, reviews, Esports, and more from the best global and regional sources.",
          alternates: { canonical: canonicalUrl },
        }
      : {
          title: "Gaming Zone | أخبار الألعاب، المراجعات والرياضات الإلكترونية",
          description:
            "تابع تغطية فورية لأحدث أخبار الألعاب، المراجعات، الهاردوير، بطولات الرياضات الإلكترونية Esports وأكثر من أفضل المصادر العربية والعالمية.",
          alternates: { canonical: canonicalUrl },
        };
  }

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
            ? "Read the article on Gaming Zone."
            : "اقرأ المقال على جيمنج زون."),
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

// Server Component Page Render — category feed or article detail.
export default async function NewsDetailsOrCategoryPage(props: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const params = await props.params;
  const { id, locale } = params;

  if (isNewsCategorySlug(id)) {
    const { sources, defaultSource, articles } = await getNewsPageData(
      id,
      locale,
    );
    // useSearchParams inside NewsListClient requires a Suspense boundary for
    // the static prerender of this route.
    return (
      <Suspense fallback={null}>
        <NewsListClient
          currentCategory={id}
          sources={sources}
          defaultSource={defaultSource}
          initialArticles={articles}
          locale={locale}
        />
      </Suspense>
    );
  }

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
