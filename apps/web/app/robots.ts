import { MetadataRoute } from "next";
import { getSiteBaseUrl } from "@/lib/metadata";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSiteBaseUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admin/", "/profile"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
