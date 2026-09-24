import type { Metadata } from "next";

const FALLBACK_BASE_URL = "https://gz1.vercel.app";

export function getSiteBaseUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || FALLBACK_BASE_URL;
}

const SITE_NAME = "Gaming Zone";
const OG_IMAGE = "/assets/cover2.png";
const OG_IMAGE_DIMENSIONS = { width: 1024, height: 500, alt: "Gaming Zone Banner" } as const;

interface LocalizedCopy {
  title: string;
  description: string;
  keywords?: string[];
}

interface LocalizedMetadataOptions {
  en: LocalizedCopy;
  ar: LocalizedCopy;
}

function copyToMetadata(copy: LocalizedCopy, locale: "en" | "ar"): Metadata {
  return {
    metadataBase: new URL(getSiteBaseUrl()),
    title: copy.title,
    description: copy.description,
    ...(copy.keywords && { keywords: copy.keywords }),
    icons: { icon: "/assets/icon.webp" },
    alternates: { canonical: `${getSiteBaseUrl()}/${locale}` },
    openGraph: {
      title: copy.title,
      description: copy.description,
      siteName: SITE_NAME,
      type: "website",
      locale: locale === "ar" ? "ar_EG" : "en_US",
      images: [{ url: OG_IMAGE, ...OG_IMAGE_DIMENSIONS }],
    },
  };
}

/**
 * Builds per-locale page metadata (title, description, Open Graph) from a
 * single definition, so each route keeps its copy in one place.
 */
export function createLocalizedMetadata({
  en,
  ar,
}: LocalizedMetadataOptions): (locale: string) => Metadata {
  return (locale: string) => copyToMetadata(locale === "ar" ? ar : en, locale === "ar" ? "ar" : "en");
}
