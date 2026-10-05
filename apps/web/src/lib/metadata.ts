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
  /**
   * Canonical path within the locale, e.g. "/games". Omit for the locale root.
   *
   * This used to be hardcoded to the site root, so every route built with this
   * helper declared the homepage as its canonical — search engines were told to
   * drop /games and /news in favour of /.
   */
  path?: string;
  /**
   * Extra metadata merged over the generated copy, for per-route fields this
   * helper does not model (currently just `robots`).
   */
  overrides?: Metadata;
}

function normalizeLocalePath(path: string): string {
  if (!path) return "";
  return path.startsWith("/") ? path : `/${path}`;
}

function copyToMetadata(
  copy: LocalizedCopy,
  locale: "en" | "ar",
  path: string,
): Metadata {
  return {
    metadataBase: new URL(getSiteBaseUrl()),
    title: copy.title,
    description: copy.description,
    ...(copy.keywords && { keywords: copy.keywords }),
    icons: { icon: "/assets/icon.webp" },
    alternates: { canonical: `${getSiteBaseUrl()}/${locale}${path}` },
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
 * Builds per-locale page metadata (title, description, canonical, Open Graph)
 * from a single definition, so each route keeps its copy in one place.
 *
 * The returned function matches Next.js' `generateMetadata(props)` contract:
 * it receives `{ params, searchParams }` and must await `params` to learn the
 * locale. It previously took the locale as its sole argument, so `locale` was
 * really the props object — `locale === "ar"` was never true, and every `/ar/*`
 * route built with this helper shipped the English title and description with a
 * canonical pointing at `/en` (verified against the built output).
 */
export function createLocalizedMetadata({
  en,
  ar,
  path = "",
  overrides,
}: LocalizedMetadataOptions): (props: {
  params?: Promise<{ locale?: string }>;
}) => Promise<Metadata> {
  const canonicalPath = normalizeLocalePath(path);

  return async (props) => {
    const params = await props?.params;
    const locale = params?.locale === "ar" ? "ar" : "en";
    const metadata = copyToMetadata(locale === "ar" ? ar : en, locale, canonicalPath);
    // Shallow-merged after generation so overrides cannot silently replace the
    // canonical: the one bug this helper exists to prevent.
    return overrides ? { ...metadata, ...overrides } : metadata;
  };
}
