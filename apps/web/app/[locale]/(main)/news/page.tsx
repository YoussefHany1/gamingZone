import { Suspense } from "react";
import { NewsListClient, getNewsPageData } from "@/features/news";
import { createLocalizedMetadata } from "@/lib/metadata";

export const generateMetadata = createLocalizedMetadata({
  path: "/news",
  en: {
    title: "Gaming Zone | Gaming News, Reviews & Esports",
    description:
      "Follow instant coverage of the latest gaming news, hardware, reviews, Esports, and more from the best global and regional sources.",
  },
  ar: {
    title: "Gaming Zone | أخبار الألعاب، المراجعات والرياضات الإلكترونية",
    description:
      "تابع تغطية فورية لأحدث أخبار الألعاب، المراجعات، الهاردوير، بطولات الرياضات الإلكترونية Esports وأكثر من أفضل المصادر العربية والعالمية.",
  },
});

/**
 * Static shell (no `searchParams` reads, so no per-request render). This page
 * IS the default "news" category — the same feed /news/news serves, kept at
 * both URLs because every internal link ("back to news", footer, sitemap)
 * points at /news and we do not pay a function invocation per visit to redirect.
 *
 * Legacy `?category=` deep links now land on the default feed; the category
 * pages live at /news/<category> and nothing internal generates the old URLs.
 *
 * Source switching does not re-render this route: NewsListClient resolves
 * ?source= in the browser. Route-derived revalidation comes from the data
 * TTLs in @/features/news/services/api (min 86400 via FEED_TTL_SECONDS).
 */
export const revalidate = 86400;

export default async function NewsPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  const { sources, defaultSource, articles } = await getNewsPageData(
    "news",
    locale,
  );

  // useSearchParams inside NewsListClient requires a Suspense boundary for the
  // static prerender of this route.
  return (
    <Suspense fallback={null}>
      <NewsListClient
        currentCategory="news"
        sources={sources}
        defaultSource={defaultSource}
        initialArticles={articles}
        locale={locale}
      />
    </Suspense>
  );
}
