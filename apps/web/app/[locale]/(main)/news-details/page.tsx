

import { NewsDetailsArticle } from "@/features/news";

interface SearchParams {
  title?: string;
  link?: string;
  thumbnail?: string;
  siteName?: string;
  siteImage?: string;
  pubDate?: string;
  description?: string;
}

export default async function NewsDetailsFallbackPage(props: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;

  const locale = params.locale;
  const title = searchParams.title || "";
  const link = searchParams.link || "";
  const thumbnail = searchParams.thumbnail || "";
  const siteName = searchParams.siteName || "Gaming Zone";
  const pubDate = searchParams.pubDate || new Date().toISOString();
  const description = searchParams.description || "";

  const activeLang = siteName.toLowerCase() === "destructoid" ? "en" : "ar";
  const isArabic = locale === "ar" || activeLang === "ar";

  return (
    <div className="w-full flex flex-col text-white">
      

      <NewsDetailsArticle
        title={title}
        link={link}
        thumbnail={thumbnail}
        siteName={siteName}
        pubDate={pubDate}
        description={description}
        isArabic={isArabic}
        locale={locale}
      />

      
    </div>
  );
}
