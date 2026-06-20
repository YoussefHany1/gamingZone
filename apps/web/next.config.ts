import type { NextConfig } from "next";
import fs from "fs";
import path from "path";

// Auto-copy assets from root assets directory to public/assets (dev convenience)
if (process.env.NODE_ENV !== "production") {
  try {
    const srcDir = path.resolve(process.cwd(), "../mobile/assets");
    const destDir = path.resolve(process.cwd(), "./public/assets");

    if (fs.existsSync(srcDir)) {
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      if (fs.realpathSync(srcDir) !== fs.realpathSync(destDir)) {
        const files = fs.readdirSync(srcDir).filter((f) => /\.(webp|png)$/i.test(f));
        for (const file of files) {
          fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
        }
        if (files.length > 0) {
          console.log(`=== Copied ${files.length} store logos to public/assets ===`);
        }
      }
    }
  } catch (err) {
    console.error("Error copying assets:", err);
  }
}

const nextConfig: NextConfig = {
  // Ensure workspace packages are properly resolved by Turbopack
  transpilePackages: ["@gaming-zone/locales"],
  images: {
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
};

export default nextConfig;
