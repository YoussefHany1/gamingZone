import type { NextConfig } from "next";
import fs from "fs";
import path from "path";

// Auto-copy assets from root assets directory to public/assets on start/reload
try {
  const srcDir = path.resolve(process.cwd(), "../assets");
  const destDir = path.resolve(process.cwd(), "./public/assets");

  if (fs.existsSync(srcDir)) {
    const realSrc = fs.realpathSync(srcDir);
    let realDest = destDir;
    if (fs.existsSync(destDir)) {
      realDest = fs.realpathSync(destDir);
    } else {
      fs.mkdirSync(destDir, { recursive: true });
      realDest = fs.realpathSync(destDir);
    }

    if (realSrc !== realDest) {
      const files = fs.readdirSync(srcDir);
      files.forEach((file) => {
        if (file.endsWith(".webp") || file.endsWith(".png")) {
          const srcFile = path.join(srcDir, file);
          const destFile = path.join(destDir, file);
          fs.copyFileSync(srcFile, destFile);
        }
      });
      console.log("=== Store logos copied to public/assets successfully ===");
    }
  }
} catch (err) {
  console.error("Error copying assets:", err);
}

const nextConfig: NextConfig = {
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
