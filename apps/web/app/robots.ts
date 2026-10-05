import { MetadataRoute } from "next";
import { getSiteBaseUrl } from "@/lib/metadata";

// robots.txt `disallow` entries are literal path prefixes, not patterns, so
// `/profile` matches the (non-existent) root path but never the real routes:
// every page in this app lives under a locale segment. Listing only the
// locale-less form left /en/profile and /ar/profile crawlable, and each hit is
// a function invocation rather than a CDN hit.
export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSiteBaseUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/admin/",
        "/profile",
        "/en/profile",
        "/ar/profile",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
