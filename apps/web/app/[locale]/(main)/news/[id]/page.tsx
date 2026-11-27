import Link from "@/components/Link";
import { Metadata } from "next";
import { redirect } from "next/navigation";
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
import {
  articlePath,
  articleSlug,
  canonicalArticleLocale,
  resolveArticleId,
} from "@/features/news/lib/articleSlug";
import { getTranslations } from "@/i18n/server";
import {
  createCanonicalAlternates,
  createLocalizedAlternates,
  getSiteBaseUrl,
  localizedUrl,
  SiteLocale,
} from "@/lib/metadata";
import { absoluteUrl, serializeJsonLd } from "@/lib/structuredData";

// Prerender the newest articles (from every category) plus every category page
// so both are served from the Vercel CDN instead of running a function on every
// request. Article slugs end in the 36-char id and the four category slugs are
// plain words — they cannot collide — so one dynamic segment serves both.
//
// Article bodies are immutable once published, so they tolerate the category
// feed's shorter window comfortably: a daily regeneration that reproduces the
// previous bytes is free on Vercel (no ISR write), it only pays CPU.
export const revalidate = 86400;

const PRERENDERED_ARTICLE_LIMIT = 12;

export async function generateStaticParams() {
  // Category slugs are static constants; article slugs come from Appwrite at
  // build time and are locale-independent, so one locale per category is
  // enough to collect them. The previous LOCALES cross-product doubled the
  // Appwrite queries for identical output.
  const idParams = await Promise.all(
    NEWS_CATEGORY_SLUGS.map(async (category) => {
      try {
        const articles = await fetchServerArticles(category, "en");
        return articles.map((art) => articleSlug(art));
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
      "[news/[id]] generateStaticParams got no article slugs — article pages " +
        "will render on demand:",
    );
  }

  return [
    ...NEWS_CATEGORY_SLUGS.map((id) => ({ id })),
    ...ids.map((id) => ({ id })),
  ];
}

// Metadata and page render branch on the segment: a category word renders the
// category feed (sources + default source, client resolves ?source=), anything
// else resolves to an article id via its trailing suffix.
export async function generateMetadata(props: {
  params: Promise<{ id: string; locale: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const { id, locale } = params;

  if (isNewsCategorySlug(id)) {
    const siteLocale: SiteLocale = locale === "ar" ? "ar" : "en";
    const copy =
      siteLocale === "en"
        ? {
            title: "Gaming Zone | Gaming News, Reviews & Esports",
            description:
              "Follow instant coverage of the latest gaming news, hardware, reviews, Esports, and more from the best global and regional sources.",
          }
        : {
            title: "Gaming Zone | أخبار الألعاب، المراجعات والرياضات الإلكترونية",
            description:
              "تابع تغطية فورية لأحدث أخبار الألعاب، المراجعات، الهاردوير، بطولات الرياضات الإلكترونية Esports وأكثر من أفضل المصادر العربية والعالمية.",
          };

    return {
      ...copy,
      alternates: createLocalizedAlternates(`/news/${id}`, siteLocale),
    };
  }

  try {
    const articleId = resolveArticleId(id);
    const art = articleId ? await getArticle(articleId) : null;
    if (!art) {
      return {
        title:
          locale === "en"
            ? "News Details | Gaming Zone"
            : "تفاصيل الخبر | Gaming Zone",
      };
    }

    const canonicalLocale = canonicalArticleLocale(art);
    const canonicalUrl = localizedUrl(canonicalLocale, articlePath(art));

    return {
      title: `Gaming Zone | ${art.title}`,
      description:
        art.description ||
        (locale === "en"
          ? "Read the article on Gaming Zone."
          : "اقرأ المقال على جيمنج زون."),
      alternates: createCanonicalAlternates(canonicalUrl),
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
        locale: canonicalLocale === "ar" ? "ar_EG" : "en_US",
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

  const articleId = resolveArticleId(id);
  const art = articleId ? await getArticle(articleId) : null;

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

  const canonicalSlug = articleSlug(art);
  if (id !== canonicalSlug) {
    redirect(`/${locale}/news/${canonicalSlug}`);
  }

  let sourceImage = undefined;
  if (art.siteName) {
    const source = await getNewsSource(art.siteName);
    sourceImage = source?.image;
  }

  const baseUrl = getSiteBaseUrl();
  const canonicalUrl = localizedUrl(
    canonicalArticleLocale(art),
    articlePath(art),
  );
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: art.title,
    description: art.description || undefined,
    image: [
      absoluteUrl(art.thumbnail, baseUrl) || `${baseUrl}/assets/cover2.png`,
    ],
    datePublished: art.pubDate,
    articleSection: art.category || undefined,
    inLanguage: art.language || "en",
    isAccessibleForFree: true,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonicalUrl,
    },
    url: canonicalUrl,
    author: {
      "@type": "Organization",
      name: art.siteName || "Gaming Zone",
    },
    publisher: {
      "@type": "Organization",
      name: "Gaming Zone",
      logo: {
        "@type": "ImageObject",
        url: `${baseUrl}/assets/icon.webp`,
      },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <NewsDetailsLayout art={art} sourceImage={sourceImage} locale={locale} />
    </>
  );
}
