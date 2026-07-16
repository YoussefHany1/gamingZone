import React from "react";
import { Metadata } from "next";
import { fetchNewsSources, fetchNews, NewsList } from "@/features/news";

export const revalidate = 600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  if (locale === "en") {
    return {
      title: "Gaming Zone | Gaming News, Reviews & Esports",
      description:
        "Follow instant coverage of the latest gaming news, hardware, reviews, Esports, and more from the best global and regional sources.",
      icons: {
        icon: "/assets/icon.webp",
      },
      openGraph: {
        title: "Gaming Zone | Gaming News, Reviews & Esports",
        description:
          "Follow instant coverage of the latest gaming news, hardware, reviews, Esports, and more from the best global and regional sources.",
        images: [
          {
            url: "/assets/cover2.png",
            width: 1024,
            height: 500,
            alt: "Gaming Zone Banner",
          },
        ],
        siteName: "Gaming Zone",
        type: "website",
      },
    };
  }

  return {
    title: "Gaming Zone | أخبار الألعاب، المراجعات والرياضات الإلكترونية",
    description:
      "تابع تغطية فورية لأحدث أخبار الألعاب، المراجعات، الهاردوير، بطولات الرياضات الإلكترونية Esports وأكثر من أفضل المصادر العربية والعالمية.",
    icons: {
      icon: "/assets/icon.webp",
    },
    openGraph: {
      title: "Gaming Zone | أخبار الألعاب، المراجعات والرياضات الإلكترونية",
      description:
        "تابع تغطية فورية لأحدث أخبار الألعاب، المراجعات، الهاردوير، بطولات الرياضات الإلكترونية Esports وأكثر من أفضل المصادر العربية والعالمية.",
      images: [
        {
          url: "/assets/cover2.png",
          width: 1024,
          height: 500,
          alt: "Gaming Zone Banner",
        },
      ],
      siteName: "Gaming Zone",
      type: "website",
    },
  };
}

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
