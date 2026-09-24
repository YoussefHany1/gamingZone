import React from "react";
import { fetchNewsSources, fetchNews, NewsList } from "@/features/news";
import { createLocalizedMetadata } from "@/lib/metadata";

export const generateMetadata = createLocalizedMetadata({
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

export const revalidate = 600;

export default async function NewsPage(props: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string; source?: string }>;
}) {
  const searchParams = await props.searchParams;
  const { locale } = await props.params;
  const currentCategory = searchParams.category || "news";

  // 1. Fetch available sources dynamically
  const sources = await fetchNewsSources(currentCategory);

  // 2. Select default source based on locale
  let defaultSource = "";
  if (sources.length > 0) {
    const preferredSources = sources
      .filter((s) => locale === "ar" ? s.language === "ar" : s.language !== "ar")
      .sort((a, b) => a.name.localeCompare(b.name, locale === "ar" ? "ar" : "en"));
      
    if (preferredSources.length > 0) {
      defaultSource = preferredSources[0].name;
    } else {
      defaultSource = [...sources].sort((a, b) => a.name.localeCompare(b.name, "en"))[0].name;
    }
  }

  const currentSource = searchParams.source || defaultSource;
  const articles = await fetchNews(currentCategory, currentSource);

  return (
    <NewsList
      locale={locale}
      currentCategory={currentCategory}
      currentSource={currentSource}
      sources={sources}
      articles={articles}
    />
  );
}
