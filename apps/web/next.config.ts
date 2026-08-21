import type { NextConfig } from "next";
import fs from "fs";
import path from "path";

// Auto-copy assets from root assets directory to public/assets (dev & build convenience)
try {
  const srcDir = path.resolve(process.cwd(), "../mobile/assets");
  const destDir = path.resolve(process.cwd(), "./public/assets");

  if (fs.existsSync(srcDir)) {
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    if (fs.realpathSync(srcDir) !== fs.realpathSync(destDir)) {
      const files = fs.readdirSync(srcDir).filter((f) => /\.(webp|png|jpg|jpeg|svg)$/i.test(f));
      for (const file of files) {
        fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
      }
      if (files.length > 0) {
        console.log(`=== Copied ${files.length} assets to public/assets ===`);
      }
    }
  }
} catch (err) {
  console.error("Error copying assets:", err);
}

const nextConfig: NextConfig = {
  // Ensure workspace packages are properly resolved by Turbopack
  transpilePackages: ["@gaming-zone/locales", "@gaming-zone/core", "@gaming-zone/utils"],
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
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
