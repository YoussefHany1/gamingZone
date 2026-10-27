import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure workspace packages are properly resolved by Turbopack
  transpilePackages: ["@gaming-zone/locales", "@gaming-zone/core", "@gaming-zone/utils"],
  poweredByHeader: false,
  images: {
    unoptimized: true,
    remotePatterns: [
      // Allowlist tightened after audit; add new hosts explicitly with justification.
      // Appwrite (common endpoints)
      { protocol: "https", hostname: "fra.cloud.appwrite.io" },
      { protocol: "https", hostname: "cloud.appwrite.io" },
      // Firebase Storage
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      // Common CDNs / game/news image hosts seen in codebase
      { protocol: "https", hostname: "cdn.cloudflare.steamstatic.com" },
      { protocol: "https", hostname: "steamcdn-a.akamaihd.net" },
      { protocol: "https", hostname: "cdn.akamai.steamstatic.com" },
      { protocol: "https", hostname: "media.rawg.io" },
      { protocol: "https", hostname: "images.igdb.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "img.youtube.com" },
    ],
  },
  async headers() {
    return [
      // Security headers for all routes
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      // NOTE: deliberately no Cache-Control override for /:locale(ar|en)/:path*.
      // Vercel derives s-maxage/stale-while-revalidate from each segment's
      // `revalidate` export, and invalidates that CDN entry on revalidatePath().
      // Setting Cache-Control here created a second TTL the ISR store could not
      // reach, so on-demand revalidation was invisible until it lapsed — and the
      // matcher also swept /:locale/auth/*, /:locale/profile and /:locale/chat
      // into a public, s-maxage=600 cache despite the "excludes auth routes"
      // comment above. Route-level cache config lives in the page segments.
      // Static Next.js assets are content-hashed — safe to cache forever
      {
        source: "/_next/static/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      // Android App Links — assetlinks.json must be served as JSON
      {
        source: "/.well-known/assetlinks.json",
        headers: [
          { key: "Content-Type", value: "application/json" },
          { key: "Cache-Control", value: "public, max-age=3600" },
        ],
      },
      // iOS Universal Links — AASA must be served as JSON (no .json extension)
      {
        source: "/.well-known/apple-app-site-association",
        headers: [
          { key: "Content-Type", value: "application/json" },
          { key: "Cache-Control", value: "public, max-age=3600" },
        ],
      },
    ];
  },
};

export default nextConfig;
