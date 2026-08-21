import Link from "@/components/Link";
import { Metadata } from "next";

import { getArticle, getNewsSource, NewsDetailsLayout } from "@/features/news";

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

    const canonicalUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://gamingzone.com"}/${locale}/news/${id}`;

    return {
      title: ` Gaming Zone | ${art.title}`,
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

import { getTranslations } from "@/i18n/server";

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

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://gamingzone.com";
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
        url: sourceImage || `${baseUrl}/assets/icon.webp`,
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
